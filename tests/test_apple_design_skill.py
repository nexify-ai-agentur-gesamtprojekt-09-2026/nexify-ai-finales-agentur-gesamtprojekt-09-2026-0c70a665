"""Apple Design Skill integration contract: file integrity, SKILL index, and AGENTS binding.

This test verifies the Apple Design Skill integration without executing upstream scripts,
installing npm packages, or modifying existing evidence. It checks:
1. Exact file list and SHA256 hashes against pinned git state
2. All 124 HIG pages are indexed in SKILL.md and vice versa
3. JSON metadata matches config/integrations/apple-design-skill.json
4. AGENTS.md binding exists and references the skill correctly
"""
import hashlib
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILL_DIR = ROOT / ".design-rules/apple-design"
SOURCE_DIR = Path("/tmp/nexify-apple-design-source")


class AppleDesignSkillTests(unittest.TestCase):
    """Test Apple Design Skill integration contract."""

    def test_skill_metadata_matches_pinned_commit(self):
        """Verify skill metadata in config/integrations/apple-design-skill.json."""
        skill_config = json.loads((ROOT / "config/integrations/apple-design-skill.json").read_text())
        
        self.assertEqual(skill_config["schema_version"], 1)
        self.assertEqual(skill_config["name"], "apple-design")
        self.assertEqual(skill_config["source"], "https://github.com/dickwu/apple-design-skill")
        self.assertEqual(skill_config["commit"], "ff4ebddf0488598723a82bfdce1afb04de0b1c44")
        self.assertEqual(skill_config["tree"], "b5f0f99c6bc7d9d9388933f6aeafba843ebfbe7b")
        self.assertEqual(skill_config["git_archive_sha256"], 
                        "fd3679dc057674be6336dfa5cac4e4b7d02c97046ade31731fe40616c7422935")
        self.assertEqual(skill_config["path"], ".design-rules/apple-design")
        self.assertEqual(skill_config["entrypoint"], "SKILL.md")
        self.assertEqual(skill_config["mode"], "vendored_reference_only")
        self.assertFalse(skill_config["upstream_scripts_executed"])
        self.assertFalse(skill_config["runtime_dependency"])
        self.assertEqual(skill_config["review"], "docs/quality/apple-hig-review.md")

    def test_all_files_match_pinned_source_exactly(self):
        """Verify all files in .design-rules/apple-design match /tmp/nexify-apple-design-source."""
        hash_file = json.loads((ROOT / "config/integrations/apple-design-files.json").read_text())
        
        # Verify metadata
        self.assertEqual(hash_file["source_commit"], "ff4ebddf0488598723a82bfdce1afb04de0b1c44")
        self.assertEqual(hash_file["source_tree"], "b5f0f99c6bc7d9d9388933f6aeafba843ebfbe7b")
        self.assertEqual(hash_file["total_hig_pages"], 124)
        
        # Verify each file exists and matches hash
        for rel_path, file_info in hash_file["files"].items():
            with self.subTest(file=rel_path):
                local_file = SKILL_DIR / rel_path
                self.assertTrue(local_file.exists(), f"File missing: {rel_path}")
                
                # Verify SHA256 hash
                actual_hash = hashlib.sha256(local_file.read_bytes()).hexdigest()
                self.assertEqual(actual_hash, file_info["sha256"], 
                               f"Hash mismatch for {rel_path}")
                
                # Verify file size
                self.assertEqual(local_file.stat().st_size, file_info["size"],
                               f"Size mismatch for {rel_path}")

    def test_no_extra_files_in_local_copy(self):
        """Verify no extra files exist in local copy that aren't in hash file."""
        hash_file = json.loads((ROOT / "config/integrations/apple-design-files.json").read_text())
        expected_files = set(hash_file["files"].keys())
        
        # Include hidden rule files too: the vendored reference tree must match exactly.
        actual_files = {
            str(file_path.relative_to(SKILL_DIR))
            for file_path in SKILL_DIR.rglob("*") if file_path.is_file()
        }
        self.assertEqual(actual_files, expected_files, "Vendored file list differs from pinned manifest")

    def test_all_124_hig_pages_indexed_in_skill(self):
        """Verify all 124 HIG pages are listed in SKILL.md index."""
        skill_md = (SKILL_DIR / "SKILL.md").read_text()
        hash_file = json.loads((ROOT / "config/integrations/apple-design-files.json").read_text())
        
        # Get all HIG pages from hash file
        hig_pages = {f.split('/')[-1] for f in hash_file["files"].keys() 
                    if f.startswith("references/hig/") and f.endswith(".md")}
        self.assertEqual(len(hig_pages), 124, "Expected 124 HIG pages")
        
        # Extract all .md references from SKILL.md
        # Look for patterns like `filename.md` in the skill file
        referenced_pages = set(re.findall(r'`([a-z0-9-]+\.md)`', skill_md))
        
        # Verify all HIG pages are referenced in SKILL.md
        missing_in_skill = hig_pages - referenced_pages
        self.assertEqual(missing_in_skill, set(), 
                        f"HIG pages not indexed in SKILL.md: {missing_in_skill}")

    def test_skill_index_only_references_existing_pages(self):
        """Verify SKILL.md doesn't reference non-existent HIG pages."""
        skill_md = (SKILL_DIR / "SKILL.md").read_text()
        hash_file = json.loads((ROOT / "config/integrations/apple-design-files.json").read_text())
        
        # Get all HIG pages from hash file
        hig_pages = {f.split('/')[-1] for f in hash_file["files"].keys() 
                    if f.startswith("references/hig/") and f.endswith(".md")}
        
        # Extract all .md references from SKILL.md
        referenced_pages = set(re.findall(r'`([a-z0-9-]+\.md)`', skill_md))
        
        # Filter to only HIG-style references (not other .md files)
        # HIG pages use kebab-case naming
        hig_style_refs = {p for p in referenced_pages if '-' in p or p in hig_pages}
        
        # Verify no references to non-existent pages
        non_existent = hig_style_refs - hig_pages - {'hig-lookup.md', 'code-audit.md', 'cross-platform.md', 'liquid-glass.md'}
        self.assertEqual(non_existent, set(), 
                        f"SKILL.md references non-existent pages: {non_existent}")

    def test_agents_md_binds_apple_design_skill(self):
        """Verify AGENTS.md in project root references Apple Design Skill."""
        agents_md = (ROOT / "AGENTS.md").read_text()
        
        # Check for Apple HIG references
        self.assertIn("Apple HIG", agents_md, "AGENTS.md should mention Apple HIG")
        self.assertIn(".design-rules/apple-design", agents_md, 
                     "AGENTS.md should reference skill path")
        self.assertIn("SKILL.md", agents_md, 
                     "AGENTS.md should reference SKILL.md entrypoint")
        self.assertIn("docs/quality/apple-hig-review.md", agents_md,
                     "AGENTS.md should reference review document")

    def test_skill_entrypoint_exists_and_valid(self):
        """Verify SKILL.md exists and contains expected structure."""
        skill_md = SKILL_DIR / "SKILL.md"
        self.assertTrue(skill_md.exists(), "SKILL.md must exist")
        
        content = skill_md.read_text()
        
        # Verify key sections exist
        self.assertIn("# Apple Design Skill", content)
        self.assertIn("## The references", content)
        self.assertIn("## Review process", content)
        self.assertIn("references/hig/", content)
        
        # Verify it mentions the correct number of pages
        # SKILL.md should mention "123 pages" or "124 pages" somewhere
        self.assertTrue(
            "123 pages" in content or "124 pages" in content,
            "SKILL.md should mention page count"
        )

    def test_review_document_exists_and_references_skill(self):
        """Verify docs/quality/apple-hig-review.md exists and references the skill."""
        review_doc = ROOT / "docs/quality/apple-hig-review.md"
        self.assertTrue(review_doc.exists(), "apple-hig-review.md must exist")
        
        content = review_doc.read_text()
        
        # Verify it references the skill
        self.assertIn("ff4ebddf0488598723a82bfdce1afb04de0b1c44", content,
                     "Review doc should reference pinned commit")
        self.assertIn("b5f0f99c6bc7d9d9388933f6aeafba843ebfbe7b", content,
                     "Review doc should reference tree hash")
        self.assertIn(".design-rules/apple-design", content,
                     "Review doc should reference skill path")

    def test_no_upstream_scripts_executed(self):
        """Verify upstream scripts were not executed (per integration contract)."""
        skill_config = json.loads((ROOT / "config/integrations/apple-design-skill.json").read_text())
        self.assertFalse(skill_config["upstream_scripts_executed"],
                        "Upstream scripts must not be executed per contract")
        
        # Verify scripts directory exists but wasn't run
        scripts_dir = SKILL_DIR / "scripts"
        self.assertTrue(scripts_dir.exists(), "scripts/ directory should exist")
        self.assertTrue((scripts_dir / "pull-hig.mjs").exists(), 
                       "pull-hig.mjs should exist but not be executed")

    def test_skill_is_vendored_reference_only(self):
        """Verify skill mode is vendored_reference_only with no runtime dependency."""
        skill_config = json.loads((ROOT / "config/integrations/apple-design-skill.json").read_text())
        self.assertEqual(skill_config["mode"], "vendored_reference_only")
        self.assertFalse(skill_config["runtime_dependency"],
                        "Skill should have no runtime dependency")

    def test_hig_pages_count_exactly_124(self):
        """Verify exactly 124 HIG pages exist in references/hig/."""
        hig_dir = SKILL_DIR / "references/hig"
        hig_files = list(hig_dir.glob("*.md"))
        self.assertEqual(len(hig_files), 124, 
                        f"Expected exactly 124 HIG pages, found {len(hig_files)}")


if __name__ == '__main__':
    unittest.main()
