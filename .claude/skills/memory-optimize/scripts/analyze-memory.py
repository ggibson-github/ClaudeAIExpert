#!/usr/bin/env python3
"""
Memory system analysis - detects bloat, duplication, metadata issues.
Part of memory-optimize skill for the expert memory system.
"""
import re
import sys
from pathlib import Path
from collections import defaultdict
from datetime import datetime


def count_lines(filepath):
    """Count lines in file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return len(f.readlines())


def count_entries(filepath):
    """Count fact/rule entries (### YYYY-MM-DD: Title)."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    return len(re.findall(r'^###\d{4}-\d{2}-\d{2}:', content, re.MULTILINE))


def check_workflow_metadata(filepath):
    """Check for missing workflow metadata in entries."""
    missing = []
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    for i, line in enumerate(lines):
        if line.startswith('### 20'):  # Entry header
            # Check next 5 lines for Workflows field
            has_workflow = any('**Workflows:**' in lines[i+j]
                               for j in range(1, min(6, len(lines)-i)))
            if not has_workflow:
                missing.append((i+1, line.strip()))

    return missing


def find_duplicates(base_path, workflow_files):
    """Find duplicate entries across files."""
    all_titles = defaultdict(list)

    for filename in workflow_files:
        filepath = base_path / filename
        if not filepath.exists():
            continue

        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        for match in re.finditer(r'^### (\d{4}-\d{2}-\d{2}): (.+)$',
                                 content, re.MULTILINE):
            date, title = match.groups()
            all_titles[title].append((filename, date))

    # Filter for duplicates (>2 occurrences likely unintentional)
    duplicates = []
    for title, locations in all_titles.items():
        if len(locations) > 2:
            duplicates.append({
                'title': title,
                'count': len(locations),
                'locations': locations
            })

    return duplicates


def analyze_memory_system(base_path):
    """Run complete analysis and return findings."""

    workflow_files = [
        'facts-incident-response.md',
        'facts-developer.md',
        'facts-operations.md',
        'rules-incident-response.md',
        'rules-developer.md',
        'rules-operations.md',
    ]

    findings = {
        'file_sizes': {},
        'entry_counts': {},
        'missing_metadata': {},
        'duplicates': [],
        'critical_issues': 0,
        'high_issues': 0,
        'medium_issues': 0,
    }

    # Analyze each file
    for filename in workflow_files:
        filepath = base_path / filename

        if not filepath.exists():
            findings['critical_issues'] += 1
            print(f"ERROR: Missing file {filename}")
            continue

        # File size
        lines = count_lines(filepath)
        findings['file_sizes'][filename] = lines

        if lines > 1500:
            findings['critical_issues'] += 1
        elif lines > 1200:
            findings['high_issues'] += 1

        # Entry count
        entries = count_entries(filepath)
        findings['entry_counts'][filename] = entries

        if entries > 80:
            findings['high_issues'] += 1

        # Missing metadata
        missing = check_workflow_metadata(filepath)
        if missing:
            findings['missing_metadata'][filename] = missing
            findings['medium_issues'] += len(missing)

    # Find duplicates
    duplicates = find_duplicates(base_path, workflow_files)
    findings['duplicates'] = duplicates
    if duplicates:
        findings['medium_issues'] += len(duplicates)

    return findings


def print_report(findings):
    """Print analysis report to console."""

    print("="*70)
    print("MEMORY SYSTEM ANALYSIS REPORT")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70)
    print()

    # File sizes
    print("FILE SIZES:")
    for filename, lines in findings['file_sizes'].items():
        if lines > 1500:
            status = "CRITICAL"
        elif lines > 1200:
            status = "WARN"
        else:
            status = "OK"
        print(f"  [{status:8}] {filename:35} {lines:4d} lines")
    print()

    # Entry counts
    print("ENTRY COUNTS:")
    total_entries = 0
    for filename, count in findings['entry_counts'].items():
        status = "WARN" if count > 80 else "OK"
        print(f"  [{status:8}] {filename:35} {count:3d} entries")
        total_entries += count
    print(f"  {'Total':<45} {total_entries:3d} entries")
    print()

    # Missing metadata
    if findings['missing_metadata']:
        total_missing = sum(len(v) for v in findings['missing_metadata'].values())
        print(f"MISSING WORKFLOW METADATA ({total_missing} entries):")
        for filename, missing in findings['missing_metadata'].items():
            print(f"  {filename}:")
            for line_num, entry in missing[:3]:  # Show first 3 per file
                print(f"    Line {line_num}: {entry[:60]}...")
            if len(missing) > 3:
                print(f"    ... and {len(missing) - 3} more in this file")
        print()

    # Duplicates
    if findings['duplicates']:
        print(f"DUPLICATE ENTRIES ({len(findings['duplicates'])}):")
        for dup in findings['duplicates'][:5]:  # Show first 5
            print(f"  \"{dup['title']}\" ({dup['count']}x):")
            for fname, date in dup['locations']:
                print(f"    - {fname} ({date})")
        if len(findings['duplicates']) > 5:
            print(f"  ... and {len(findings['duplicates']) - 5} more duplicates")
        print()

    # Summary
    print("-"*70)
    print("ISSUE SUMMARY:")
    print(f"  Critical: {findings['critical_issues']}")
    print(f"  High:     {findings['high_issues']}")
    print(f"  Medium:   {findings['medium_issues']}")
    print()

    # Recommendation
    if findings['critical_issues'] > 0:
        print("RECOMMENDATION: IMMEDIATE OPTIMIZATION REQUIRED")
        print("  Critical issues detected. Run optimization plan.")
    elif findings['high_issues'] > 0:
        print("RECOMMENDATION: Optimization needed")
        print("  High-priority issues detected.")
    elif findings['medium_issues'] > 0:
        print("RECOMMENDATION: Consider optimization")
        print("  Minor issues detected, optimization optional.")
    else:
        print("STATUS: HEALTHY")
        print("  Memory system is in good health.")

    print()
    print("-"*70)
    return findings['critical_issues'] + findings['high_issues']


def main():
    """Main entry point."""
    # Determine base path (facts directory)
    if len(sys.argv) > 1:
        base_path = Path(sys.argv[1])
    else:
        # Try to find facts directory
        for path in [Path('facts'), Path('../facts'), Path('../../facts')]:
            if path.exists() and path.is_dir():
                base_path = path
                break
        else:
            print("ERROR: Could not find facts directory")
            print("Usage: python analyze-memory.py [facts-directory]")
            sys.exit(1)

    print(f"Analyzing: {base_path.resolve()}")
    print()

    # Run analysis
    findings = analyze_memory_system(base_path)

    # Print report
    issue_count = print_report(findings)

    # Exit code
    sys.exit(1 if issue_count > 0 else 0)


if __name__ == '__main__':
    main()
