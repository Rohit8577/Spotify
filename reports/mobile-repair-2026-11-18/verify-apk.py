import hashlib
import json
import pathlib
import sys
import zipfile

apk = pathlib.Path(sys.argv[1])
output = pathlib.Path(sys.argv[2])
with zipfile.ZipFile(apk) as archive:
    names = archive.namelist()
    bad_entry = archive.testzip()
    assert bad_entry is None, f'Corrupt ZIP entry: {bad_entry}'
    assert 'AndroidManifest.xml' in names
    assert 'classes.dex' in names
    assert any(name.startswith('lib/arm64-v8a/') for name in names)
    private_names = [name for name in names if any(marker in name.lower() for marker in (
        'firebase-admin', 'service-account', '.keystore', '.jks', '.pem', '.env', 'credentials.json'))]
    assert not private_names, 'Private credential filename found in APK'
    manifest = archive.read('AndroidManifest.xml')
    def manifest_contains(value):
        return any(value.encode(encoding) in manifest for encoding in ('utf-8', 'utf-16le'))
    permissions = {
        'mediaPlayback': manifest_contains('android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK'),
        'wakeLock': manifest_contains('android.permission.WAKE_LOCK'),
        'notifications': manifest_contains('android.permission.POST_NOTIFICATIONS'),
        'microphone': manifest_contains('android.permission.RECORD_AUDIO'),
    }
    assert permissions['mediaPlayback'] and permissions['wakeLock'] and permissions['notifications']
    assert not permissions['microphone'], 'Playback app unexpectedly requests microphone permission'
    assert manifest_contains('com.rohit8577.sangeetx')
    ota_configured = manifest_contains('https://u.expo.dev/378e5912-d80f-4619-a88c-b3b9f8ce7061')
    assert ota_configured, 'Expo OTA configuration is missing'
    resources = archive.read('resources.arsc')
    firebase_project = 'sangeetx-5552b'
    firebase_present = any(firebase_project.encode(encoding) in resources for encoding in ('utf-8', 'utf-16le'))
    assert firebase_present, 'Expected Firebase Android project is missing'
    fingerprint_bytes = archive.read('assets/fingerprint')
    fingerprint = fingerprint_bytes.decode('utf-8').strip()
    try:
        parsed = json.loads(fingerprint)
        if isinstance(parsed, dict):
            fingerprint = parsed.get('hash', fingerprint)
        elif isinstance(parsed, str):
            fingerprint = parsed
    except json.JSONDecodeError:
        pass
    with apk.open('rb') as apk_file:
        apk_file.seek(max(0, apk.stat().st_size - 2 * 1024 * 1024))
        signing_block = b'APK Sig Block 42' in apk_file.read()
        assert signing_block, 'Android APK signing block is missing'
    with apk.open('rb') as apk_file:
        checksum = hashlib.file_digest(apk_file, 'sha256').hexdigest()
    result = {
        'sizeBytes': apk.stat().st_size,
        'sha256': checksum,
        'zipIntegrity': 'passed',
        'firebaseResourcesPresent': firebase_present,
        'privateCredentialFilenamesPresent': False,
        'arm64NativeLibrariesPresent': True,
        'apkSigningBlockPresent': signing_block,
        'manifestPermissions': permissions,
        'otaConfigured': ota_configured,
        'embeddedRuntime': fingerprint,
        'runtimeStorage': 'assets/fingerprint',
    }
    output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result, indent=2))
