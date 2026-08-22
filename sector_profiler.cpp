// Profiles lookup latency over a 10,000-entry mock sector table:
// unoptimized linear scan vs. an ordered std::map acting as an index cache.
#include <chrono>
#include <cstdint>
#include <iomanip>
#include <iostream>
#include <map>
#include <random>
#include <vector>

struct SectorRecord {
    std::uint64_t lba;
    std::uint32_t checksum;
    bool bad_sector;
};

constexpr int NUM_SECTORS = 10000;
constexpr int NUM_RUNS = 5;
constexpr int QUERIES_PER_RUN = 2000;

std::vector<SectorRecord> generate_sectors(int count) {
    std::vector<SectorRecord> sectors;
    sectors.reserve(count);
    std::mt19937_64 rng(42);
    std::uniform_int_distribution<std::uint32_t> checksumDist(0, 0xFFFFFFFFu);
    for (int i = 0; i < count; ++i) {
        sectors.push_back({static_cast<std::uint64_t>(i) * 8, checksumDist(rng), (i % 97 == 0)});
    }
    return sectors;
}

std::vector<std::uint64_t> generate_queries(const std::vector<SectorRecord>& sectors, int count) {
    std::mt19937_64 rng(1337);
    std::uniform_int_distribution<std::size_t> idxDist(0, sectors.size() - 1);
    std::vector<std::uint64_t> queries;
    queries.reserve(count);
    for (int i = 0; i < count; ++i) {
        queries.push_back(sectors[idxDist(rng)].lba);
    }
    return queries;
}

// Unoptimized: O(n) linear filter over the whole block array per query.
const SectorRecord* linear_find(const std::vector<SectorRecord>& sectors, std::uint64_t targetLba) {
    for (const auto& sector : sectors) {
        if (sector.lba == targetLba) {
            return &sector;
        }
    }
    return nullptr;
}

std::map<std::uint64_t, std::size_t> build_index(const std::vector<SectorRecord>& sectors) {
    std::map<std::uint64_t, std::size_t> index;
    for (std::size_t i = 0; i < sectors.size(); ++i) {
        index[sectors[i].lba] = i;
    }
    return index;
}

// Optimized: O(log n) lookup via the ordered std::map index cache.
const SectorRecord* indexed_find(const std::vector<SectorRecord>& sectors,
                                  const std::map<std::uint64_t, std::size_t>& index,
                                  std::uint64_t targetLba) {
    auto it = index.find(targetLba);
    if (it == index.end()) return nullptr;
    return &sectors[it->second];
}

int main() {
    const auto sectors = generate_sectors(NUM_SECTORS);
    const auto queries = generate_queries(sectors, QUERIES_PER_RUN);

    std::cout << "=== Sector Profiling Summary ===\n";
    std::cout << "Sectors:          " << NUM_SECTORS << "\n";
    std::cout << "Queries per run:  " << QUERIES_PER_RUN << "\n";
    std::cout << "Runs:             " << NUM_RUNS << "\n\n";

    // --- Baseline: unoptimized linear search ---
    std::cout << "--- Baseline (Linear Search) ---\n";
    double baselineTotalUs = 0.0;
    std::size_t baselineMatches = 0;

    for (int run = 1; run <= NUM_RUNS; ++run) {
        auto start = std::chrono::high_resolution_clock::now();
        for (auto target : queries) {
            if (linear_find(sectors, target) != nullptr) {
                ++baselineMatches;
            }
        }
        auto end = std::chrono::high_resolution_clock::now();

        double us = std::chrono::duration<double, std::micro>(end - start).count();
        baselineTotalUs += us;
        std::cout << "Run " << run << ": " << std::fixed << std::setprecision(2) << us << " us\n";
    }
    double baselineAvgUs = baselineTotalUs / NUM_RUNS;
    std::cout << "Average baseline latency: " << std::fixed << std::setprecision(2) << baselineAvgUs
              << " us\n\n";

    // --- Optimized: ordered std::map used as an index cache ---
    auto indexStart = std::chrono::high_resolution_clock::now();
    const auto index = build_index(sectors);
    auto indexEnd = std::chrono::high_resolution_clock::now();
    double indexBuildUs = std::chrono::duration<double, std::micro>(indexEnd - indexStart).count();

    std::cout << "--- Optimized (std::map Index Lookup) ---\n";
    std::cout << "Index build time (one-time, excluded from lookup latency): " << std::fixed
              << std::setprecision(2) << indexBuildUs << " us\n";

    double optimizedTotalUs = 0.0;
    std::size_t optimizedMatches = 0;

    for (int run = 1; run <= NUM_RUNS; ++run) {
        auto start = std::chrono::high_resolution_clock::now();
        for (auto target : queries) {
            if (indexed_find(sectors, index, target) != nullptr) {
                ++optimizedMatches;
            }
        }
        auto end = std::chrono::high_resolution_clock::now();

        double us = std::chrono::duration<double, std::micro>(end - start).count();
        optimizedTotalUs += us;
        std::cout << "Run " << run << ": " << std::fixed << std::setprecision(2) << us << " us\n";
    }
    double optimizedAvgUs = optimizedTotalUs / NUM_RUNS;
    std::cout << "Average optimized latency: " << std::fixed << std::setprecision(2) << optimizedAvgUs
              << " us\n\n";

    double reductionUs = baselineAvgUs - optimizedAvgUs;
    double reductionPct = (reductionUs / baselineAvgUs) * 100.0;

    std::cout << "--- Result ---\n";
    std::cout << "Absolute time reduction: " << std::fixed << std::setprecision(2) << reductionUs
              << " us\n";
    std::cout << "Relative improvement:    " << std::fixed << std::setprecision(2) << reductionPct
              << "%\n";
    std::cout << "Sanity check (matches):  baseline=" << baselineMatches
              << " optimized=" << optimizedMatches << "\n";

    return 0;
}
