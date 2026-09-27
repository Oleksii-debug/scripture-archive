from pathlib import Path
import unittest


FILE = Path(__file__).resolve()
ROOT = FILE.parents[1]
PACKAGING = ROOT / "packaging"


def repository_root() -> Path:
    for parent in FILE.parents:
        workflow = parent / ".github" / "workflows" / "r06-no-admin-acceptance.yml"
        if workflow.is_file():
            return parent
    raise RuntimeError("repository root with no-admin workflow not found")


WORKFLOW = repository_root() / ".github" / "workflows" / "r06-no-admin-acceptance.yml"


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
        self.assertIn("$result.identity_name = $identity.Name", self.harness)
        self.assertIn("$result.user_sid = $identity.User.Value", self.harness)
        self.assertIn("Standard-user token required", self.harness)
        self.assertIn("Resolve-CurrentUserLocalAppData", self.harness)
        self.assertIn("ProfileList\\$sid", self.harness)
        self.assertIn("ProfileImagePath", self.harness)
        self.assertIn("Resolved LocalApplicationData escaped the current SID-bound profile", self.harness)
        self.assertIn('$result.local_app_data_source = "HKLM_ProfileList_current_sid"', self.harness)
        self.assertIn("$result.profile_sid_bound = [bool]$profile.profile_sid_bound", self.harness)
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
            "WaitForExit(120000)",
            "Standard-user acceptance process exceeded the 120-second bound",
            "Standard-user identity evidence is incomplete",
            "Per-user state root was not bound to the child SID profile",
            'HKLM_ProfileList_current_sid',
            "NO_ADMIN_ADMIN_NEGATIVE_CONTROL_PASS",
            "Admin negative control returned unexpected exit code",
            "NO_ADMIN_ACCEPTANCE_FAIL",
            "S-1-5-32-544",
            "Standard-user account unexpectedly belongs to the Administrators group",
        ):
            self.assertIn(token, self.workflow)
        self.assertNotIn("Add-LocalGroupMember", self.workflow)
        self.assertNotIn("net localgroup administrators", self.workflow.lower())
        self.assertIn('if ($result.is_admin -ne $true)', self.workflow)
        self.assertIn('if ($negative.ExitCode -ne 2)', self.workflow)

    def test_workflow_stages_evidence_inside_workspace_before_upload(self):
        self.assertIn("Collect no-admin evidence inside workspace", self.workflow)
        self.assertIn('$destination = Join-Path $PWD "no_admin_evidence"', self.workflow)
        self.assertIn("NO_ADMIN_EVIDENCE_STAGED", self.workflow)
        self.assertIn("path: no_admin_evidence", self.workflow)
        upload_block = self.workflow.split("- uses: actions/upload-artifact@v4", 1)[1]
        self.assertNotIn("C:\\Users\\Public", upload_block)
        self.assertNotIn("r06_platform\\dist\\no_admin_admin_negative.json", upload_block)

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
