"""Extract a verified release.zip into a NEW directory; reject unexpected entries."""
import hashlib
import json
import pathlib
import re
import sys
import zipfile
archive, destination = map(pathlib.Path, sys.argv[1:])
pattern = re.compile(r"fastlane/(?:screenshots/[A-Za-z0-9-]+|metadata/android/[A-Za-z0-9-]+/images/(?:phoneScreenshots|sevenInchScreenshots|tenInchScreenshots))/[A-Za-z0-9_.-]+\.png\Z")
with zipfile.ZipFile(archive) as package:
    entries = package.infolist()
    names = [entry.filename for entry in entries]
    if len(names) != len(set(names)) or len(names) > 802:
        raise ValueError("Duplicate entries or oversized package")
    manifest_entry = package.getinfo("manifest.json")
    if manifest_entry.file_size > 2 * 1024 * 1024:
        raise ValueError("Oversized manifest")
    manifest = json.loads(package.read(manifest_entry))
    if manifest.get("schemaVersion") != 1 or manifest.get("valid") is not True:
        raise ValueError("Package is not validated")
    expected = {file["path"]: file for file in manifest["files"]}
    if set(names) != set(expected) | {"manifest.json", "checksums.sha256"}:
        raise ValueError("Unexpected package entries")
    for path, file in expected.items():
        if not pattern.fullmatch(path) or ".." in path or package.getinfo(path).file_size != file["sizeBytes"] or not 0 < file["sizeBytes"] <= 10 * 1024 * 1024:
            raise ValueError("Invalid path or image size")
    destination.mkdir(parents=True, exist_ok=False)
    for path, file in expected.items():
        data = package.read(path)  # zipfile checks each entry's CRC.
        if hashlib.sha256(data).hexdigest() != file["sha256"]:
            raise ValueError("Screenshot checksum mismatch")
        target = destination / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    (destination / "manifest.json").write_text(json.dumps(manifest, indent=2))
print(f"Extracted {len(expected)} validated screenshots to {destination}")
