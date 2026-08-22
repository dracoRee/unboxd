#!/usr/bin/env python3
"""Benchmarks concurrent write throughput against a simulated PostgreSQL target."""

import random
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

NUM_THREADS = 20
TOTAL_TASKS = 1000

# Simulated per-write latency range (seconds): network round-trip + INSERT/UPDATE.
MIN_LATENCY = 0.002
MAX_LATENCY = 0.015

# Simulated failure probability per write (timeouts / lock contention under load).
FAILURE_RATE = 0.03

_lock = threading.Lock()
_success_count = 0
_failure_count = 0


def simulate_write_task(task_id: int) -> bool:
    time.sleep(random.uniform(MIN_LATENCY, MAX_LATENCY))
    return random.random() >= FAILURE_RATE


def run_benchmark() -> None:
    global _success_count, _failure_count

    start_time = time.perf_counter()

    with ThreadPoolExecutor(max_workers=NUM_THREADS) as executor:
        futures = [executor.submit(simulate_write_task, i) for i in range(TOTAL_TASKS)]
        for future in as_completed(futures):
            with _lock:
                if future.result():
                    _success_count += 1
                else:
                    _failure_count += 1

    end_time = time.perf_counter()
    elapsed = end_time - start_time

    iops = TOTAL_TASKS / elapsed
    error_rate = (_failure_count / TOTAL_TASKS) * 100

    print("=== Simulated PostgreSQL Write Benchmark ===")
    print(f"Threads:               {NUM_THREADS}")
    print(f"Total tasks:           {TOTAL_TASKS}")
    print(f"Elapsed time:          {elapsed:.4f} s")
    print(f"Successful writes:     {_success_count}")
    print(f"Failed writes:         {_failure_count}")
    print(f"Simulated IOPS:        {iops:.2f} ops/sec")
    print(f"Error rate under load: {error_rate:.2f}%")


if __name__ == "__main__":
    run_benchmark()
