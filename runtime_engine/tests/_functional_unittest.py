from __future__ import annotations

import inspect
import re
import tempfile
import unittest
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Callable


class _Mark:
    def parametrize(self, argnames: str | tuple[str, ...], argvalues: list[Any]):
        if isinstance(argnames, str):
            names = tuple(part.strip() for part in argnames.split(",") if part.strip())
        else:
            names = tuple(argnames)

        def decorate(func: Callable[..., Any]) -> Callable[..., Any]:
            setattr(func, "__unittest_parametrize__", (names, tuple(argvalues)))
            return func

        return decorate


class _PytestCompat:
    mark = _Mark()

    @contextmanager
    def raises(self, expected_exception: type[BaseException], match: str | None = None):
        case = unittest.TestCase()
        manager = (
            case.assertRaisesRegex(expected_exception, re.compile(match))
            if match is not None
            else case.assertRaises(expected_exception)
        )
        with manager as caught:
            yield caught

    @staticmethod
    def skip(message: str) -> None:
        raise unittest.SkipTest(message)


pytest = _PytestCompat()


def _parameter_rows(func: Callable[..., Any]) -> tuple[tuple[dict[str, Any], str], ...]:
    marker = getattr(func, "__unittest_parametrize__", None)
    if marker is None:
        return (({}, ""),)
    names, values = marker
    rows: list[tuple[dict[str, Any], str]] = []
    for index, value in enumerate(values):
        if len(names) == 1:
            mapped = {names[0]: value}
        else:
            if not isinstance(value, (tuple, list)) or len(value) != len(names):
                raise RuntimeError(f"invalid parameter row for {func.__name__}")
            mapped = dict(zip(names, value))
        rows.append((mapped, f"[{index}]"))
    return tuple(rows)


def make_load_tests(namespace: dict[str, Any]):
    """Adapt pytest-style module functions to the repository's unittest discovery gate."""

    def load_tests(
        loader: unittest.TestLoader,
        standard_tests: unittest.TestSuite,
        pattern: str | None,
    ) -> unittest.TestSuite:
        del loader, pattern
        suite = unittest.TestSuite()
        suite.addTests(standard_tests)

        for name, func in sorted(namespace.items()):
            if not name.startswith("test_") or not inspect.isfunction(func):
                continue
            signature = inspect.signature(func)
            for params, suffix in _parameter_rows(func):
                unexpected = set(params) - set(signature.parameters)
                if unexpected:
                    raise RuntimeError(f"unexpected parameters for {name}: {sorted(unexpected)}")

                def invoke(
                    _func: Callable[..., Any] = func,
                    _signature: inspect.Signature = signature,
                    _params: dict[str, Any] = dict(params),
                ) -> None:
                    kwargs = dict(_params)
                    if "tmp_path" in _signature.parameters:
                        with tempfile.TemporaryDirectory() as tmp:
                            kwargs["tmp_path"] = Path(tmp)
                            _func(**kwargs)
                    else:
                        _func(**kwargs)

                suite.addTest(
                    unittest.FunctionTestCase(
                        invoke,
                        description=f"{name}{suffix}",
                    )
                )
        return suite

    return load_tests
