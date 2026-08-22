#include "hdd_controller.hpp"

#include <map>
#include <set>

namespace {
const std::map<State, std::set<State>> kTransitions = {
    {State::IDLE, {State::SPINNING_UP}},
    {State::SPINNING_UP, {State::READY, State::ERROR}},
    {State::READY, {State::SEEKING, State::SLEEP}},
    {State::SEEKING, {State::READING, State::WRITING, State::ERROR}},
    {State::READING, {State::READY, State::ERROR}},
    {State::WRITING, {State::READY, State::ERROR}},
    {State::SLEEP, {State::SPINNING_UP}},
    {State::ERROR, {State::IDLE}},
};
}  // namespace

HDDController::HDDController(State initial_state) : current_state_(initial_state) {}

State HDDController::state() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return current_state_;
}

bool HDDController::transition_to(State new_state) {
    std::lock_guard<std::mutex> lock(mutex_);
    const auto& allowed = kTransitions.at(current_state_);
    if (allowed.count(new_state)) {
        current_state_ = new_state;
        return true;
    }
    return false;
}
