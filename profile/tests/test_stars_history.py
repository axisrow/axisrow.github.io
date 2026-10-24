from __future__ import annotations

from collections import Counter
from copy import deepcopy
from datetime import UTC, date, datetime
import unittest
from unittest import mock

from profile.sync import stars_history


class StarHistoryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.start = date(2026, 10, 22)
        self.history = {
            "start_date": self.start.isoformat(),
            "opening_balance": 100,
            "entries": [{"date": "2026-10-22", "gained": 0, "total": 100}],
        }

    def build(self, events, history, *, day=23, target=100):
        with (
            mock.patch.object(stars_history, "owned_original_repositories", return_value=[{"full_name": "axisrow/example"}]),
            mock.patch.object(stars_history, "star_dates", return_value=Counter(events)),
            mock.patch.object(stars_history, "datetime") as clock,
        ):
            clock.now.return_value = datetime(2026, 10, day, 3, 17, tzinfo=UTC)
            return stars_history.build_history("axisrow", self.start, target, history)

    def test_late_star_is_recovered_on_the_next_day(self):
        result = self.build({self.start: 1}, self.history)
        self.assertEqual(result["entries"], [
            {"date": "2026-10-22", "gained": 1, "total": 101},
            {"date": "2026-10-23", "gained": 0, "total": 101},
        ])

    def test_a_second_run_on_the_same_day_updates_the_partial_day(self):
        result = self.build({self.start: 2}, self.history, day=22)
        self.assertEqual(result["entries"], [{"date": "2026-10-22", "gained": 2, "total": 102}])

    def test_backfills_old_gaps_and_recomputes_subsequent_totals(self):
        self.history["entries"].extend([
            {"date": "2026-10-23", "gained": 1, "total": 101},
            {"date": "2026-10-24", "gained": 0, "total": 101},
        ])
        result = self.build({self.start: 2, date(2026, 10, 24): 3}, self.history, day=25)
        self.assertEqual([e["gained"] for e in result["entries"]], [2, 1, 3, 0])
        self.assertEqual([e["total"] for e in result["entries"]], [102, 103, 106, 106])
        self.assertEqual(result["opening_balance"], 100)

    def test_unstars_or_unavailable_feeds_do_not_erase_known_events(self):
        self.history["entries"][0].update(gained=3, total=103)
        for events in ({self.start: 1}, {}):
            with self.subTest(events=events):
                result = self.build(events, self.history)
                self.assertEqual(result["entries"][0], self.history["entries"][0])
                self.assertEqual(result["entries"][-1]["total"], 103)

    def test_repeated_runs_are_idempotent_and_leave_the_input_unchanged(self):
        original = deepcopy(self.history)
        first = self.build({self.start: 2}, self.history)
        second = self.build({self.start: 2}, first)
        self.assertEqual(first, second)
        self.assertEqual(self.history, original)

    def test_new_history_keeps_the_declared_total_and_opening_balance(self):
        result = self.build({self.start: 2}, None)
        self.assertEqual(result["opening_balance"], 98)
        self.assertEqual(result["entries"][-1]["total"], 100)

    def test_new_history_rejects_an_impossible_initial_total(self):
        with self.assertRaisesRegex(RuntimeError, "exceed the declared initial total"):
            self.build({self.start: 101}, None)

    def test_an_earlier_clock_does_not_truncate_existing_history(self):
        self.history["entries"].append({"date": "2026-10-23", "gained": 1, "total": 101})
        result = self.build({}, self.history, day=22)
        self.assertEqual(result["entries"], self.history["entries"])


if __name__ == "__main__":
    unittest.main()
