from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
PACKAGING = ROOT / "packaging"
WORKFLOW = ROOT.parents[2] / ".github" / "workflows" / "r06-no-admin-acceptance.yml"


class NoAdminAcceptanceContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.harness = (PACKAGING / "run_no_admin_acceptance.ps1").read_text(encoding="utf-8")
        cls.probe = (PACKAGING / "probe_packaged_startup.ps1").read_text(encoding="utf-8")
        cls.workflow = WORKFLOW.read_text(encoding="utf-8")

    def test_harness_refuses_admin_and_requires_real_standard_user_profile(self):
        self.assertIn("Test-IsAdministrator", self.harness)
        self.assertIn("WindowsBuiltInRole]::Administrator", self.harness)
        self.assertIn("if ($result.is_admin)", self.harness)
        self.assertIn("Standard-user token required", self.harness)
        self.assertIn("LocalApplicationData", self.harness)
        self.assertIn("$result.local_app_data = $localAppData", self.harness)
        self.assertIn("per_user_state_writable", self.harness)
        self.assertIn('status = "NO_ADMIN_ACCEPTANCE_PASS"', self.harness)
        self.assertIn('status = "NO_ADMIN_ACCEPTANCE_FAIL"', self.harness)

    def test_harness_binds_exact_artifact_and_unicode_spaced_per_user_copy(self):
        self.assertIn("Get-FileHash -LiteralPath $source -Algorithm SHA256", self.harness)
        self.assertIn("Get-FileHash -LiteralPath $target -Algorithm SHA256", self.harness)
        self.assertIn("Source artifact SHA-256 does not match", self.harness)
        self.assertIn("Copied artifact SHA-256 differs", self.harness)
        self.assertIn("Архів Писання Standard User", self.harness)
        self.assertIn("unicode_spaced_path", self.harness)
        self.assertIn("Copy-Item -LiteralPath $source", self.harness)
        self.assertIn("Get-FileHash -LiteralPath $buildExe -Algorithm SHA256", self.workflow)
        self.assertIn("Public staging copy does not match the exact build artifact SHA-256", self.workflow)
        self.assertIn("No-admin evidence SHA-256 does not match the exact build artifact", self.workflow)

    def test_harness_requires_webview2_and_real_packaged_startup(self):
        self.assertIn("Get-WebView2Candidates", self.harness)
        self.assertIn("Edge WebView2 Runtime was not detected", self.harness)
        self.assertIn("probe_packaged_startup.ps1", self.harness)
        self.assertIn("process_started", self.harness)
        self.assertIn("survived_probe_window", self.harness)
        self.assertIn("did not remain alive for the full no-admin probe window", self.harness)
        self.assertIn("Packaged process did not start under the standard-user token", self.harness)
        self.assertIn("Start-Process -FilePath $exe -PassThru", self.probe)

    def test_workflow_runs_harness_under_ephemeral_non_admin_credentials(self):
        for token in (
            "New-LocalUser",
            "Start-Process",
            "-Credential $credential",
            "-LoadUserProfile",
            "run_no_admin_acceptance.ps1",
            "NO_ADMIN_ACCEPTANCE_PASS",
            "is_admin",
            "Remove-LocalUser",
        ):
            self.assertIn(token, self.workflow)
        self.assertNotIn("Add-LocalGroupMember", self.workflow)
        self.assertNotIn("net localgroup administrators", self.workflow.lower())

    def test_workflow_does_not_echo_or_persist_generated_password(self):
        self.assertIn("ConvertTo-SecureString", self.workflow)
        self.assertNotIn("Write-Output $password", self.workflow)
        self.assertNotIn("Write-Host $password", self.workflow)
        self.assertNotIn("echo $password", self.workflow.lower())
        password_lines = "\n".join(line for line in self.workflow.splitlines() if "$password" in line)
        self.assertNotIn("Set-Content", password_lines)
        self.assertNotIn("Out-File", password_lines)


if __name__ == "__main__":
    unittest.main()
