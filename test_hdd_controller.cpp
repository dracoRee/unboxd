// Native unit test suite for HDDController — no external test framework.
// Compile: g++ -std=c++17 -pthread test_hdd_controller.cpp hdd_controller.cpp -o test_hdd_controller
#include "hdd_controller.hpp"

#include <atomic>
#include <cassert>
#include <iostream>
#include <string>
#include <thread>
#include <vector>

int main() {
    int passed = 0;
    int failed = 0;

    auto check = [&](bool condition, const std::string& description) {
        if (condition) {
            ++passed;
        } else {
            ++failed;
            std::cerr << "[FAIL] " << description << "\n";
        }
    };

    // Drives an already-default-constructed (IDLE) controller to `target`
    // via a known-legal path, without asserting on the way (the happy-path
    // section below already verifies each of these hops explicitly). Used
    // only to set up preconditions for the illegal-jump section.
    // (HDDController holds a std::mutex, so it's non-copyable/non-movable —
    // this takes it by reference rather than returning it by value.)
    auto driveTo = [](HDDController& c, State target) {
        switch (target) {
            case State::IDLE:
                break;
            case State::SPINNING_UP:
                c.transition_to(State::SPINNING_UP);
                break;
            case State::READY:
                c.transition_to(State::SPINNING_UP);
                c.transition_to(State::READY);
                break;
            case State::SEEKING:
                c.transition_to(State::SPINNING_UP);
                c.transition_to(State::READY);
                c.transition_to(State::SEEKING);
                break;
            case State::READING:
                c.transition_to(State::SPINNING_UP);
                c.transition_to(State::READY);
                c.transition_to(State::SEEKING);
                c.transition_to(State::READING);
                break;
            case State::WRITING:
                c.transition_to(State::SPINNING_UP);
                c.transition_to(State::READY);
                c.transition_to(State::SEEKING);
                c.transition_to(State::WRITING);
                break;
            case State::SLEEP:
                c.transition_to(State::SPINNING_UP);
                c.transition_to(State::READY);
                c.transition_to(State::SLEEP);
                break;
            case State::ERROR:
                c.transition_to(State::SPINNING_UP);
                c.transition_to(State::ERROR);
                break;
        }
    };

    // Attempts one hop, verifies the return value and (on success) the
    // resulting state. Each call yields either 1 or 2 explicit assertions.
    auto step = [&](HDDController& ctrl, State target, bool expectSuccess, const std::string& label) {
        bool result = ctrl.transition_to(target);
        check(result == expectSuccess, label + ": transition_to() returned " +
                                            std::string(expectSuccess ? "true" : "false") + " as expected");
        if (expectSuccess) {
            check(ctrl.state() == target, label + ": state updated to target");
        }
    };

    // ------------------------------------------------------------------
    // Section 1: legal transitions — all 14 edges, each exercised at
    // least once via continuous walks from IDLE.
    // ------------------------------------------------------------------
    {
        HDDController hddA;
        step(hddA, State::SPINNING_UP, true, "A1 IDLE->SPINNING_UP");
        step(hddA, State::READY, true, "A2 SPINNING_UP->READY");
        step(hddA, State::SEEKING, true, "A3 READY->SEEKING");
        step(hddA, State::READING, true, "A4 SEEKING->READING");
        step(hddA, State::READY, true, "A5 READING->READY");
        step(hddA, State::SLEEP, true, "A6 READY->SLEEP");
        step(hddA, State::SPINNING_UP, true, "A7 SLEEP->SPINNING_UP");
        step(hddA, State::ERROR, true, "A8 SPINNING_UP->ERROR");
        step(hddA, State::IDLE, true, "A9 ERROR->IDLE");

        HDDController hddB;
        step(hddB, State::SPINNING_UP, true, "B1 IDLE->SPINNING_UP");
        step(hddB, State::READY, true, "B2 SPINNING_UP->READY");
        step(hddB, State::SEEKING, true, "B3 READY->SEEKING");
        step(hddB, State::WRITING, true, "B4 SEEKING->WRITING");
        step(hddB, State::READY, true, "B5 WRITING->READY");

        HDDController hddC;
        step(hddC, State::SPINNING_UP, true, "C1 IDLE->SPINNING_UP");
        step(hddC, State::READY, true, "C2 SPINNING_UP->READY");
        step(hddC, State::SEEKING, true, "C3 READY->SEEKING");
        step(hddC, State::WRITING, true, "C4 SEEKING->WRITING");
        step(hddC, State::ERROR, true, "C5 WRITING->ERROR");

        HDDController hddD;
        step(hddD, State::SPINNING_UP, true, "D1 IDLE->SPINNING_UP");
        step(hddD, State::READY, true, "D2 SPINNING_UP->READY");
        step(hddD, State::SEEKING, true, "D3 READY->SEEKING");
        step(hddD, State::ERROR, true, "D4 SEEKING->ERROR");

        HDDController hddE;
        step(hddE, State::SPINNING_UP, true, "E1 IDLE->SPINNING_UP");
        step(hddE, State::READY, true, "E2 SPINNING_UP->READY");
        step(hddE, State::SEEKING, true, "E3 READY->SEEKING");
        step(hddE, State::READING, true, "E4 SEEKING->READING");
        step(hddE, State::ERROR, true, "E5 READING->ERROR");
    }

    // ------------------------------------------------------------------
    // Section 2: illegal jumps are explicitly blocked, and rejection
    // leaves the state unchanged. Two representative illegal targets
    // per state, including the SLEEP-must-go-through-SPINNING_UP rule.
    // ------------------------------------------------------------------
    {
        struct IllegalCase {
            State from;
            State illegalTarget;
            std::string label;
        };

        const std::vector<IllegalCase> illegalCases = {
            {State::IDLE, State::READY, "IDLE->READY blocked"},
            {State::IDLE, State::SEEKING, "IDLE->SEEKING blocked"},
            {State::SPINNING_UP, State::IDLE, "SPINNING_UP->IDLE blocked"},
            {State::SPINNING_UP, State::WRITING, "SPINNING_UP->WRITING blocked"},
            {State::READY, State::READING, "READY->READING blocked"},
            {State::READY, State::ERROR, "READY->ERROR blocked"},
            {State::SEEKING, State::IDLE, "SEEKING->IDLE blocked"},
            {State::SEEKING, State::SLEEP, "SEEKING->SLEEP blocked"},
            {State::READING, State::SEEKING, "READING->SEEKING blocked"},
            {State::READING, State::SPINNING_UP, "READING->SPINNING_UP blocked"},
            {State::WRITING, State::SEEKING, "WRITING->SEEKING blocked"},
            {State::WRITING, State::IDLE, "WRITING->IDLE blocked"},
            {State::SLEEP, State::READY, "SLEEP->READY blocked (must go via SPINNING_UP)"},
            {State::SLEEP, State::READING, "SLEEP->READING blocked (must go via SPINNING_UP)"},
            {State::ERROR, State::READY, "ERROR->READY blocked"},
            {State::ERROR, State::SPINNING_UP, "ERROR->SPINNING_UP blocked"},
        };

        for (const auto& tc : illegalCases) {
            HDDController ctrl;
            driveTo(ctrl, tc.from);
            bool result = ctrl.transition_to(tc.illegalTarget);
            check(result == false, tc.label + ": transition_to() returned false");
            check(ctrl.state() == tc.from, tc.label + ": state left unchanged");
        }
    }

    // ------------------------------------------------------------------
    // Section 3: concurrency stress tests. Many threads race to change
    // the same controller's state simultaneously; the mutex inside
    // transition_to() must ensure exactly one legal winner per contested
    // state and leave the controller in a consistent final state.
    // ------------------------------------------------------------------
    {
        // 3a. Five rounds of a two-way race from READY: half the threads
        // try SEEKING, half try SLEEP. Only the first check-and-set wins.
        constexpr int THREADS_PER_ROUND = 20;
        for (int round = 1; round <= 5; ++round) {
            HDDController ctrl;
            ctrl.transition_to(State::SPINNING_UP);
            ctrl.transition_to(State::READY);

            std::atomic<int> successCount{0};
            std::vector<std::thread> threads;
            threads.reserve(THREADS_PER_ROUND);
            for (int i = 0; i < THREADS_PER_ROUND; ++i) {
                State target = (i % 2 == 0) ? State::SEEKING : State::SLEEP;
                threads.emplace_back([&ctrl, &successCount, target]() {
                    if (ctrl.transition_to(target)) {
                        successCount.fetch_add(1, std::memory_order_relaxed);
                    }
                });
            }
            for (auto& t : threads) t.join();

            check(successCount.load() == 1,
                  "Concurrency round " + std::to_string(round) + ": exactly one thread wins the READY race");
            State finalState = ctrl.state();
            check(finalState == State::SEEKING || finalState == State::SLEEP,
                  "Concurrency round " + std::to_string(round) + ": final state is a valid contended target");
        }

        // 3b. Many threads hammering the same single-target transition
        // from IDLE — only the first call can legally succeed.
        {
            HDDController ctrl;
            constexpr int NUM_THREADS = 50;
            std::atomic<int> successCount{0};
            std::vector<std::thread> threads;
            threads.reserve(NUM_THREADS);
            for (int i = 0; i < NUM_THREADS; ++i) {
                threads.emplace_back([&ctrl, &successCount]() {
                    if (ctrl.transition_to(State::SPINNING_UP)) {
                        successCount.fetch_add(1, std::memory_order_relaxed);
                    }
                });
            }
            for (auto& t : threads) t.join();

            check(successCount.load() == 1, "Concurrency IDLE hammer: exactly one thread wins");
            check(ctrl.state() == State::SPINNING_UP, "Concurrency IDLE hammer: final state is SPINNING_UP");
        }

        // 3c. Two-way race from SEEKING: READING vs WRITING. (ERROR is
        // deliberately excluded here — it's reachable from READING *and*
        // WRITING too, so a "losing" thread could legally chain a second
        // transition into it after the first winner moves the state,
        // which would break the exactly-one-winner invariant below.)
        {
            HDDController ctrl;
            ctrl.transition_to(State::SPINNING_UP);
            ctrl.transition_to(State::READY);
            ctrl.transition_to(State::SEEKING);

            constexpr int NUM_THREADS = 30;
            std::atomic<int> successCount{0};
            std::vector<std::thread> threads;
            threads.reserve(NUM_THREADS);
            for (int i = 0; i < NUM_THREADS; ++i) {
                State target = (i % 2 == 0) ? State::READING : State::WRITING;
                threads.emplace_back([&ctrl, &successCount, target]() {
                    if (ctrl.transition_to(target)) {
                        successCount.fetch_add(1, std::memory_order_relaxed);
                    }
                });
            }
            for (auto& t : threads) t.join();

            check(successCount.load() == 1, "Concurrency SEEKING 2-way race: exactly one thread wins");
            State finalState = ctrl.state();
            check(finalState == State::READING || finalState == State::WRITING,
                  "Concurrency SEEKING 2-way race: final state is a valid contended target");
        }
    }

    // ------------------------------------------------------------------
    // Summary
    // ------------------------------------------------------------------
    const int total = passed + failed;
    std::cout << "=== HDDController Test Suite ===\n";
    std::cout << "Passed: " << passed << " / " << total << "\n";
    std::cout << "Failed: " << failed << " / " << total << "\n";

    assert(total >= 45 && "Test suite must contain at least 45 explicit assertions");

    return failed == 0 ? 0 : 1;
}
