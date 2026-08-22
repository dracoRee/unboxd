// Demonstrates a genuine data race on a shared cache-sector block, then fixes
// it with row-level locking (std::timed_mutex + std::unique_lock) backed by
// an atomic aggregate checksum, with graceful handling of simulated lock
// timeouts and a final structural-corruption check.
#include <array>
#include <atomic>
#include <chrono>
#include <cstdint>
#include <cstdio>
#include <memory>
#include <mutex>
#include <random>
#include <thread>
#include <vector>

constexpr int NUM_THREADS = 20;
constexpr int OPS_PER_THREAD = 5000;
constexpr int NUM_ROWS = 4;
constexpr long long INCREMENT = 1;
constexpr auto LOCK_TIMEOUT = std::chrono::microseconds(25);
constexpr int MAX_LOCK_RETRIES = 5;

constexpr std::uint64_t CANARY = 0xDEADBEEFCAFEBABEULL;

// --- Phase 1: the buggy version -------------------------------------------
// A plain shared block with no synchronization at all. `frontGuard`/
// `backGuard` are canary values that would only change if some operation
// wrote out of bounds; `checksum` tracks the same total the row values
// should sum to, so any mismatch between the two exposes lost updates.
struct UnsafeCacheSector {
    std::uint64_t frontGuard = CANARY;
    std::array<long long, NUM_ROWS> rowValues{};
    long long checksum = 0;
    std::uint64_t backGuard = CANARY;
};

void unsafeWorker(UnsafeCacheSector& sector, std::atomic<long long>& groundTruthTotal) {
    thread_local std::mt19937 rng(std::random_device{}() ^ std::hash<std::thread::id>{}(std::this_thread::get_id()));
    std::uniform_int_distribution<int> rowDist(0, NUM_ROWS - 1);

    for (int i = 0; i < OPS_PER_THREAD; ++i) {
        int row = rowDist(rng);

        // Unsynchronized read-modify-write: two threads can both read the
        // same stale value before either writes back, silently dropping
        // one of the two increments.
        long long current = sector.rowValues[row];
        current += INCREMENT;
        sector.rowValues[row] = current;
        sector.checksum += INCREMENT;

        groundTruthTotal.fetch_add(INCREMENT, std::memory_order_relaxed);
    }
}

// --- Phase 2: the corrected version ----------------------------------------
// One std::timed_mutex per row emulates row-level (rather than whole-table)
// locking: threads touching different rows never block each other. The
// aggregate checksum is a std::atomic so it stays consistent regardless of
// which row lock is currently held.
struct SafeCacheSector {
    std::uint64_t frontGuard = CANARY;
    std::array<long long, NUM_ROWS> rowValues{};
    std::atomic<long long> checksum{0};
    std::array<std::timed_mutex, NUM_ROWS> rowLocks;
    std::uint64_t backGuard = CANARY;
};

void safeWorker(SafeCacheSector& sector, std::atomic<long long>& groundTruthTotal,
                 std::atomic<long long>& timeoutCount, std::atomic<long long>& committedOps) {
    thread_local std::mt19937 rng(std::random_device{}() ^ std::hash<std::thread::id>{}(std::this_thread::get_id()));
    std::uniform_int_distribution<int> rowDist(0, NUM_ROWS - 1);

    for (int i = 0; i < OPS_PER_THREAD; ++i) {
        int row = rowDist(rng);
        bool committed = false;

        for (int attempt = 0; attempt < MAX_LOCK_RETRIES && !committed; ++attempt) {
            std::unique_lock<std::timed_mutex> lock(sector.rowLocks[row], std::defer_lock);

            if (lock.try_lock_for(LOCK_TIMEOUT)) {
                // Row-level "transaction": row value and aggregate checksum
                // move together while this row's lock is held.
                long long current = sector.rowValues[row];
                current += INCREMENT;
                sector.rowValues[row] = current;
                sector.checksum.fetch_add(INCREMENT, std::memory_order_relaxed);
                committed = true;
                // `lock` releases automatically here (unique_lock destructor).
            } else {
                // Simulated lock timeout: don't deadlock or crash, just
                // count it and back off briefly before retrying.
                timeoutCount.fetch_add(1, std::memory_order_relaxed);
                std::this_thread::yield();
            }
        }

        if (committed) {
            groundTruthTotal.fetch_add(INCREMENT, std::memory_order_relaxed);
            committedOps.fetch_add(1, std::memory_order_relaxed);
        }
        // Still uncommitted after MAX_LOCK_RETRIES: gracefully skip this
        // operation. Ground truth simply excludes it, so the row/checksum
        // invariant stays exact instead of drifting.
    }
}

int main() {
    std::printf("=== Phase 1: Unsynchronized Data Race ===\n");
    {
        auto sector = std::make_unique<UnsafeCacheSector>();
        std::atomic<long long> groundTruthTotal{0};

        std::vector<std::thread> threads;
        threads.reserve(NUM_THREADS);
        for (int i = 0; i < NUM_THREADS; ++i) {
            threads.emplace_back(unsafeWorker, std::ref(*sector), std::ref(groundTruthTotal));
        }
        for (auto& t : threads) t.join();

        long long rowSum = 0;
        for (auto v : sector->rowValues) rowSum += v;

        long long expected = groundTruthTotal.load();
        long long lostUpdates = expected - rowSum;
        bool guardsIntact = (sector->frontGuard == CANARY && sector->backGuard == CANARY);

        std::printf("Expected total increments applied:  %lld\n", expected);
        std::printf("Actual sum of row values:           %lld\n", rowSum);
        std::printf("Actual checksum:                    %lld\n", sector->checksum);
        std::printf("Lost updates due to data race:      %lld\n", lostUpdates);
        std::printf("Checksum vs. row-sum mismatch:      %lld\n", sector->checksum - rowSum);
        std::printf("Structural canary guards intact:    %s\n", guardsIntact ? "yes" : "NO -- MEMORY CORRUPTION");
        std::printf("%s\n\n", lostUpdates != 0
                                   ? "RESULT: Data race confirmed -- shared state corrupted."
                                   : "RESULT: No lost updates observed this run (races are timing-dependent).");
    }

    std::printf("=== Phase 2: Synchronized Row-Level Locking (Corrected) ===\n");
    {
        auto sector = std::make_unique<SafeCacheSector>();
        std::atomic<long long> groundTruthTotal{0};
        std::atomic<long long> timeoutCount{0};
        std::atomic<long long> committedOps{0};

        std::vector<std::thread> threads;
        threads.reserve(NUM_THREADS);
        for (int i = 0; i < NUM_THREADS; ++i) {
            threads.emplace_back(safeWorker, std::ref(*sector), std::ref(groundTruthTotal),
                                  std::ref(timeoutCount), std::ref(committedOps));
        }
        for (auto& t : threads) t.join();

        long long rowSum = 0;
        for (auto v : sector->rowValues) rowSum += v;

        long long expected = groundTruthTotal.load();
        long long checksumValue = sector->checksum.load();

        bool rowSumMatches = (rowSum == expected);
        bool checksumMatches = (checksumValue == rowSum);
        bool guardsIntact = (sector->frontGuard == CANARY && sector->backGuard == CANARY);
        bool allGood = rowSumMatches && checksumMatches && guardsIntact;

        std::printf("Total operations attempted:         %lld\n",
                    static_cast<long long>(NUM_THREADS) * OPS_PER_THREAD);
        std::printf("Operations committed:               %lld\n", committedOps.load());
        std::printf("Lock timeouts encountered/handled:  %lld\n", timeoutCount.load());
        std::printf("Expected total (committed ops only):%lld\n", expected);
        std::printf("Actual sum of row values:           %lld\n", rowSum);
        std::printf("Actual checksum:                    %lld\n", checksumValue);
        std::printf("Row sum matches expected:           %s\n", rowSumMatches ? "yes" : "NO");
        std::printf("Checksum matches row sum:           %s\n", checksumMatches ? "yes" : "NO");
        std::printf("Structural canary guards intact:    %s\n", guardsIntact ? "yes" : "NO -- MEMORY CORRUPTION");
        std::printf("%s\n", allGood
                                 ? "RESULT: Zero corrupted structural memory allocations. Safeguards verified."
                                 : "RESULT: CORRUPTION DETECTED -- safeguards failed.");

        return allGood ? 0 : 1;
    }
}
