#pragma once

#include <mutex>

enum class State {
    IDLE,
    SPINNING_UP,
    READY,
    SEEKING,
    READING,
    WRITING,
    SLEEP,
    ERROR
};

class HDDController {
public:
    explicit HDDController(State initial_state = State::IDLE);

    State state() const;
    bool transition_to(State new_state);

private:
    State current_state_;
    mutable std::mutex mutex_;
};
