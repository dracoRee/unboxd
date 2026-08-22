#!/usr/bin/env python3
"""Thread-safe object-oriented state machine modeling hard drive operational modes."""

import threading
from enum import Enum, auto


class HDDState(Enum):
    IDLE = auto()
    SPINNING_UP = auto()
    READY = auto()
    SEEKING = auto()
    READING = auto()
    WRITING = auto()
    SLEEP = auto()
    ERROR = auto()


class HDDController:
    _TRANSITIONS = {
        HDDState.IDLE: {HDDState.SPINNING_UP},
        HDDState.SPINNING_UP: {HDDState.READY, HDDState.ERROR},
        HDDState.READY: {HDDState.SEEKING, HDDState.SLEEP},
        HDDState.SEEKING: {HDDState.READING, HDDState.WRITING, HDDState.ERROR},
        HDDState.READING: {HDDState.READY, HDDState.ERROR},
        HDDState.WRITING: {HDDState.READY, HDDState.ERROR},
        HDDState.SLEEP: {HDDState.SPINNING_UP},
        HDDState.ERROR: {HDDState.IDLE},
    }

    def __init__(self, initial_state: HDDState = HDDState.IDLE):
        self._state = initial_state
        self._lock = threading.Lock()

    @property
    def state(self) -> HDDState:
        with self._lock:
            return self._state

    def transition_to(self, new_state: HDDState) -> bool:
        with self._lock:
            if new_state in self._TRANSITIONS[self._state]:
                self._state = new_state
                return True
            return False


if __name__ == "__main__":
    controller = HDDController()
    print(f"Initial state: {controller.state.name}")

    path = [
        HDDState.SPINNING_UP,
        HDDState.READY,
        HDDState.SEEKING,
        HDDState.WRITING,
        HDDState.READY,
        HDDState.SLEEP,
    ]
    for target in path:
        ok = controller.transition_to(target)
        print(f"-> {target.name}: {'OK' if ok else 'REJECTED'} (state={controller.state.name})")

    illegal = controller.transition_to(HDDState.READING)
    print(f"-> READING from SLEEP: {'OK' if illegal else 'REJECTED'} (state={controller.state.name})")
