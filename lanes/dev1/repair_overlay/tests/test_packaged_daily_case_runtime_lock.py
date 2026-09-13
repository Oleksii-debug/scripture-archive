import unittest

from runtime_engine.scripture_archive_runtime.models import PlayerMemory, Session
from scripture_archive_platform.application.runtime_gateway import RuntimeBackedPlayerGateway


class _TrackingLock:
    def __init__(self):
        self.entries = 0
        self.active = 0

    def __enter__(self):
        self.entries += 1
        self.active += 1
        return self

    def __exit__(self, exc_type, exc, tb):
        self.active -= 1
        return False


class _Runtime:
    def __init__(self):
        self.memory = PlayerMemory(profile_id="daily-case-lock")
        self.session = Session(session_id="daily-case-lock")
        self.current_node_id = None
        self.content = {}


class _LockAwareLoader:
    def __init__(self, lock):
        self.lock = lock
        self.observed_locked_projection = False

    def list_campaigns(self):
        if self.lock.active <= 0:
            raise AssertionError("Daily Case projection escaped the gateway runtime lock")
        self.observed_locked_projection = True
        return []

    def list_missions(self, campaign_id):
        return []


class PackagedDailyCaseRuntimeLockTests(unittest.TestCase):
    def test_daily_case_uses_the_same_runtime_lock_as_runtime_invocation(self):
        runtime = _Runtime()
        lock = _TrackingLock()
        loader = _LockAwareLoader(lock)

        def runtime_invoke(request):
            return {
                "api_version": "runtime.v1",
                "request_id": request["request_id"],
                "mastery": {},
            }

        gateway = RuntimeBackedPlayerGateway(
            runtime_invoke,
            runtime_application=runtime,
            loader=loader,
        )
        gateway._runtime_lock = lock

        runtime_response = gateway.invoke("player.get_mastery", {})
        self.assertEqual("runtime.v1", runtime_response["api_version"])
        self.assertEqual(1, lock.entries)
        self.assertEqual(0, lock.active)

        daily_case = gateway.get_daily_case()
        self.assertTrue(loader.observed_locked_projection)
        self.assertEqual("scripture.player.daily_case.v1", daily_case["schema"])
        self.assertTrue(daily_case["read_only"])
        self.assertEqual(2, lock.entries)
        self.assertEqual(0, lock.active)


if __name__ == "__main__":
    unittest.main()
