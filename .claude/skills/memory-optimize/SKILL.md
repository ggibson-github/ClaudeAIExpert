---
name: memory-optimize
description: Analyze and optimize the expert memory system for performance and maintainability
when_to_use: |
 - Quarterly health checks (every 3 months)
 - After capturing 10+ new facts/rules in a session
 - When memory files grow by 20% (e.g., 1,300 → 1,560 lines)
 - When agent performance degrades (slow memory lookups, context bloat)
 - User explicitly requests memory optimization or health check
---

## Memory System Optimization Skill

Detects and resolves memory system issues: file bloat, duplication, poor organization, missing metadata, weak navigation.

## Purpose

Maintain expert memory system health by:
- Monitoring file sizes and entry counts
- Detecting content duplication
- Verifying workflow metadata coverage
- Identifying oversized sections
- Generating optimization plans when issues detected

## Usage

**Quick health check**:
```
/memory-optimize --metrics
```

**Full analysis with plan generation**:
```
/memory-optimize
```
or
```
/memory-optimize --analyze-only
```

**Execute approved optimization plan**:
```
/memory-optimize --execute-phase=1
```

## Arguments

- `--metrics` - Quick health check only (file sizes, entry counts, metadata coverage)
- `--analyze-only` - Full analysis and generate plan without implementing (default)
- `--execute-phase=<N>` - Execute specific phase of previously approved plan
- `--full` - Run analysis → plan → implementation (requires approval before Phase 1)

## Workflow

### 1. Health Check (--metrics)

Quick validation of memory system health:

```bash
# Count entries in workflow files
python3 << 'PYEOF'
import re
from pathlib import Path

base = Path("facts")

def count_entries(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        return len(re.findall(r'^###\d{4}-\d{2}-\d{2}:', content, re.MULTILINE))

def get_filesize(filepath):
    return filepath.stat().st_size

# Workflow files
files = {
    'facts-incident-response.md': 'Incident Response Facts',
    'facts-developer.md': 'Developer Facts',
    'facts-operations.md': 'Operations Facts',
    'rules-incident-response.md': 'Incident Response Rules',
    'rules-developer.md': 'Developer Rules',
    'rules-operations.md': 'Operations Rules',
}

print("MEMORY SYSTEM HEALTH CHECK")
print("="*60)

total_lines = 0
total_entries = 0
warnings = []

for filename, label in files.items():
    filepath = base / filename
    if filepath.exists():
        with open(filepath, 'r') as f:
            lines = len(f.readlines())
        entries = count_entries(filepath)
        size_kb = get_filesize(filepath) / 1024
        
        total_lines += lines
        total_entries += entries
        
        print(f"{label:30} {lines:4d} lines {entries:2d} entries, {size_kb:5.1f}KB")
        
        # Check thresholds
        if lines > 1500:
            warnings.append(f"  WARNING: {filename} exceeds 1500 lines ({lines})")
        if entries > 80:
            warnings.append(f"  WARNING: {filename} has {entries} entries (>80)")
    else:
        warnings.append(f"  ERROR: Missing file {filename}")

print()
print(f"Total: {total_lines} lines, {total_entries} entries")
print()

if warnings:
    print("ISSUES DETECTED:")
    for w in warnings:
        print(w)
    print("\nRun '/memory-optimize' for full analysis")
else:
    print("Status: HEALTHY - No issues detected")

PYEOF
```

**Health Thresholds**:
- ✅ File size: <1,000 lines per file (Warning: >1,500)
- ✅ Entries per file: <80 entries (Warning: >80)
- ✅ Workflow metadata: 100% coverage
- ✅ Duplication: Zero repeated entries

### 2. Full Analysis (default or --analyze-only)

Comprehensive analysis to detect issues and generate optimization plan:

**Detection Script** (facts/analyze-memory.py):
```python
#!/usr/bin/env python3
"""
Memory system analysis - detects bloat, duplication, metadata issues
"""
import re
from pathlib import Path
from collections import defaultdict

def analyze_memory_system(base_path):
    """Analyze memory system and return findings"""
    
    findings = {
        'file_sizes': {},
        'entry_counts': {},
        'duplicates': [],
        'missing_metadata': [],
        'large_sections': [],
        'critical_issues': 0,
        'high_issues': 0,
        'medium_issues': 0,
    }

    workflow_files = [
        'facts-incident-response.md',
        'facts-developer.md',
        'facts-operations.md',
        'rules-incident-response.md',
        'rules-developer.md',
        'rules-operations.md',
    ]

    # Analyze each file
    all_titles = defaultdict(list)

    for filename in workflow_files:
        filepath = base_path / filename
        if not filepath.exists():
            findings['critical_issues'] += 1
            continue

        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')

        # File size check
        line_count = len(lines)
        findings['file_sizes'][filename] = line_count
        if line_count > 1500:
            findings['critical_issues'] += 1
        elif line_count > 1200:
            findings['high_issues'] += 1

        # Entry count and metadata
        entries = re.findall(
            r'^### (\d{4}-\d{2}-\d{2}): (.+?)$.*?^\*\*Scope:\*\*.*?$.*?(?:^\*\*Workflows:\*\*.*?$)?',
            content,
            re.MULTILINE | re.DOTALL
        )

        findings['entry_counts'][filename] = len(entries)

        # Check for duplicates
        for match in re.finditer(r'^### (\d{4}-\d{2}-\d{2}): (.+)$', content, re.MULTILINE):
            date, title = match.groups()
            all_titles[title].append((filename, date))

        # Check for missing workflow metadata
        for i, line in enumerate(lines):
            if line.startswith('### 20'): # Entry header
                # Check next ~5 lines for Workflows field
                has_workflow = any('**Workflows:**' in lines[i+j] for j in range(1, 6) if i+j < len(lines))
                if not has_workflow:
                    findings['missing_metadata'].append(f"{filename}:{i+1} - {line}")
                    findings['medium_issues'] += 1

    # Find duplicates
    for title, locations in all_titles.items():
        if len(locations) > 2: # More than 2 is likely unintentional
            findings['duplicates'].append({
                'title': title,
                'count': len(locations),
                'locations': locations
            })
            findings['medium_issues'] += 1

    return findings

# Run analysis
findings = analyze_memory_system(Path('facts'))

# Generate report
print("MEMORY SYSTEM ANALYSIS REPORT")
print("="*70)
print()

# File sizes
print("FILE SIZES:")
for filename, lines in findings['file_sizes'].items():
    status = "OK" if lines < 1200 else ("WARN" if lines < 1500 else "CRITICAL")
    print(f"  {status:8} {filename:30} {lines:4d} lines")
print()

# Entry counts
print("ENTRY COUNTS:")
for filename, count in findings['entry_counts'].items():
    print(f"  {filename:30} {count:2d} entries")
print()

# Duplicates
if findings['duplicates']:
    print(f"DUPLICATES DETECTED ({len(findings['duplicates'])}):")
    for dup in findings['duplicates']:
        print(f"\"{dup['title']}\" appears {dup['count']}x")
        for fname, date in dup['locations']:
            print(f"    - {fname} ({date})")
    print()

# Missing metadata
if findings['missing_metadata']:
    print(f"MISSING WORKFLOW METADATA ({len(findings['missing_metadata'])}):")
    for entry in findings['missing_metadata'][:5]:  # Show first 5
        print(f"  {entry}")
    if len(findings['missing_metadata']) > 5:
        print(f"  ... and {len(findings['missing_metadata']) - 5} more")
print()
    # Summary
print("ISSUE SUMMARY:")
print(f"  Critical: {findings['critical_issues']}")
print(f"  High: {findings['high_issues']}")
print(f"  Medium:   {findings['medium_issues']}")
print()

if findings['critical_issues'] > 0 or findings['high_issues'] > 0:
    print("RECOMMENDATION: Optimization needed")
    print("  Run optimization plan to address issues")
elif findings['medium_issues'] > 0:
    print("RECOMMENDATION: Consider optimization")
    print("  Minor issues detected, optimization optional")
    else:
    print("STATUS: HEALTHY")
    print("  Memory system is in good health")
```

Save as `facts/analyze-memory.py` and run:
```bash
cd facts
python3 analyze-memory.py
```

### 3. Generate Optimization Plan

If issues detected, generate a phased optimization plan in `.claude/plans/memory-optimization-YYYY-MM-DD.md`:

**Plan Template**:
```markdown
# Memory Optimization Plan

**Date**: YYYY-MM-DD
**Trigger**: [quarterly check | 20% growth | performance degradation | user request]

## Issues Detected

[List of critical/high/medium issues from analysis]

## Phase 1: Structural (if critical issues)

- [ ] Split oversized files (>1,500 lines)
- [ ] Consolidate duplicates
- [ ] Backfill missing workflow metadata

## Phase 2: Content (if high issues)

- [ ] Break up oversized sections (>15 entries)
- [ ] Standardize procedure formats
- [ ] Add cross-references

## Phase 3: Maintenance (if medium issues)

- [ ] Update MEMORY-INDEX.md
- [ ] Add section summaries
- [ ] Verify navigation links

## Expected Outcomes

[Performance improvements, file size reductions, etc.]

## Verification

- [ ] Run validation script (zero content loss)
- [ ] Verify file sizes within thresholds
- [ ] Check workflow metadata coverage
- [ ] Test navigation index links
```

### 4. Execute Optimization (--execute-phase=N)

When user approves plan:

```bash
# Phase 1: Use Python automation (learned from WID-22953979)
python3 facts/split-and-optimize.py --phase=1

# Phase 2: Manual with review
# (Content formatting requires human judgment)

# Phase 3: Update index
python3 facts/update-index.py
```

**Key Lesson**: For files >1,000 lines, use Python scripts (not manual editing) to:
- Parse by category/section
- Map to workflows
- Add metadata programmatically
- Generate new files deterministically

## Memory System Health Metrics

### Healthy Thresholds
- File size: <1,000 lines per file
- Section size: 5-15 entries per section
- Workflow metadata: 100% coverage
- Duplication: Zero repeated entries (except intentional cross-workflow)
- Cross-references: Present in 30%+ of related entries

### Warning Signs
- Files >1,500 lines (context bloat risk)
- Sections >20 entries (discovery friction)
- Metadata coverage <80% (filtering broken)
- 3+ duplicate entries (maintenance debt)
- No index or navigation aids (scalability problem)

### Critical Issues
- Files >2,500 lines (agent efficiency severely degraded)
- No workflow-based splitting (all contexts polluted)
- 10+ duplicates (content divergence risk)
- Missing workflow-specific files

## Best Practices

1. **Run `--metrics` quarterly** (every 3 months)
2. **Run full analysis when facts/rules grow 20%** (e.g., 1,300 → 1,560 lines)
3. **Always get user approval before executing changes**
4. **Use Python scripts for large-scale refactoring** (files >1,000 lines)
5. **Validate zero content loss after optimization** (entry count diff = 0)
6. **Commit optimization work separately** from feature development
7. **Archive original files** before major restructuring

## Automation Scripts

### analyze-memory.py
Detects issues: file bloat, duplication, missing metadata, oversized sections

### split-and-optimize.py
Automates workflow-based file splitting with metadata injection

### update-index.py
Regenerates MEMORY-INDEX.md based on current file structure

### validate-migration.py
Verifies entry count preservation (original vs new)

## Example Invocations

**Quarterly check**:
```
/memory-optimize --metrics
```

**After major feature work**:
```
# Captured 15 new facts/rules during WID-XXXXXXX
/memory-optimize
# Review generated plan in .claude/plans/
# If approved:
/memory-optimize --execute-phase-1
```

**When memory feels slow**:
```
/memory-optimize
# Review findings and recommendations
```

## Maintenance Schedule

- **Weekly**: Monitor file sizes during active work
- **Monthly**: Check for obvious duplicates
- **Quarterly**: Run full `--metrics` health check
- **Annually**: Full optimization review (Phases 1-3)
- **Ad-hoc**: After 10+ facts/rules added in one session

## Output Location

- Health check: console output
- Analysis report: console + `facts/memory-analysis-YYYY-MM-DD.txt`
- Optimization plan: `.claude/plans/memory-optimization-YYYY-MM-DD.md`
- Archives: `facts/*-ARCHIVE-YYYY-MM-DD.md`

## Success Criteria

After optimization:
- ✅ All files <1,000 lines (or <1,500 if justified)
- ✅ Entry count preserved (validation script confirms)
- ✅ 100% workflow metadata coverage
- ✅ Navigation index updated and accurate
- ✅ Zero unintentional duplicates
- ✅ Original files archived

---

**Version**: 1.0
**Next review**: 
