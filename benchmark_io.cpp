// Benchmarks concurrent write throughput against a simulated disk-sector target.
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstdio>
#include <functional>
#include <mutex>
#include <queue>
#include <random>
#include <thread>
#include <vector>

class ThreadPool {
public:
    explicit ThreadPool(size_t numThreads) : stop(false) {
        for (size_t i = 0; i < numThreads; ++i) {
            workers.emplace_back([this] { workerLoop(); });
        }
    }

    ~ThreadPool() {
        {
            std::lock_guard<std::mutex> lock(queueMutex);
            stop = true;
        }
        condition.notify_all();
        for (auto& worker : workers) {
            if (worker.joinable()) worker.join();
        }
    }

    void enqueue(std::function<void()> task) {
        {
            std::lock_guard<std::mutex> lock(queueMutex);
            tasks.push(std::move(task));
        }
        condition.notify_one();
    }

private:
    void workerLoop() {
        while (true) {
            std::function<void()> task;
            {
                std::unique_lock<std::mutex> lock(queueMutex);
                condition.wait(lock, [this] { return stop || !tasks.empty(); });
                if (stop && tasks.empty()) return;
                task = std::move(tasks.front());
                tasks.pop();
            }
            task();
        }
    }

    std::vector<std::thread> workers;
    std::queue<std::function<void()>> tasks;
    std::mutex queueMutex;
    std::condition_variable condition;
    bool stop;
};

constexpr int NUM_THREADS = 20;
constexpr int TOTAL_TASKS = 1000;
constexpr double MIN_LATENCY_MS = 2.0;
constexpr double MAX_LATENCY_MS = 15.0;
constexpr double FAILURE_RATE = 0.03;

std::atomic<int> successCount{0};
std::atomic<int> failureCount{0};
std::atomic<int> completedCount{0};

std::mutex doneMutex;
std::condition_variable doneCondition;

void simulateWriteTask() {
    thread_local std::mt19937 rng(
        std::random_device{}() ^ std::hash<std::thread::id>{}(std::this_thread::get_id()));
    std::uniform_real_distribution<double> latencyDist(MIN_LATENCY_MS, MAX_LATENCY_MS);
    std::uniform_real_distribution<double> failureDist(0.0, 1.0);

    std::this_thread::sleep_for(std::chrono::duration<double, std::milli>(latencyDist(rng)));

    if (failureDist(rng) < FAILURE_RATE) {
        failureCount.fetch_add(1, std::memory_order_relaxed);
    } else {
        successCount.fetch_add(1, std::memory_order_relaxed);
    }

    if (completedCount.fetch_add(1, std::memory_order_relaxed) + 1 == TOTAL_TASKS) {
        std::lock_guard<std::mutex> lock(doneMutex);
        doneCondition.notify_one();
    }
}

int main() {
    ThreadPool pool(NUM_THREADS);

    auto start = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < TOTAL_TASKS; ++i) {
        pool.enqueue(simulateWriteTask);
    }

    {
        std::unique_lock<std::mutex> lock(doneMutex);
        doneCondition.wait(lock, [] { return completedCount.load() == TOTAL_TASKS; });
    }

    auto end = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double> elapsed = end - start;

    double iops = TOTAL_TASKS / elapsed.count();
    double errorRate = (static_cast<double>(failureCount.load()) / TOTAL_TASKS) * 100.0;

    std::printf("=== Simulated Disk Write Benchmark (C++17) ===\n");
    std::printf("Threads:               %d\n", NUM_THREADS);
    std::printf("Total tasks:           %d\n", TOTAL_TASKS);
    std::printf("Elapsed time:          %.4f s\n", elapsed.count());
    std::printf("Successful writes:     %d\n", successCount.load());
    std::printf("Failed writes:         %d\n", failureCount.load());
    std::printf("Simulated IOPS:        %.2f ops/sec\n", iops);
    std::printf("Error rate under load: %.2f%%\n", errorRate);

    return 0;
}
