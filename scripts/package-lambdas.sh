#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
artifact_dir="$project_dir/build"

mkdir -p "$artifact_dir"
find "$artifact_dir" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +

npm run build --workspace @astroai/api
mkdir -p "$artifact_dir/api-package"
cp -R "$project_dir/apps/api/dist" "$artifact_dir/api-package/dist"
cp "$project_dir/apps/api/package.json" "$artifact_dir/api-package/package.json"
npm install --omit=dev --ignore-scripts --prefix "$artifact_dir/api-package" --cache /tmp/astroai-npm-cache
(
  cd "$artifact_dir/api-package"
  zip -qr "$artifact_dir/api.zip" dist node_modules package.json
)

mkdir -p "$artifact_dir/calculator-package/app"
cp "$project_dir/services/astrology/app/__init__.py" "$artifact_dir/calculator-package/app/__init__.py"
cp "$project_dir/services/astrology/app/main.py" "$artifact_dir/calculator-package/app/main.py"
cp "$project_dir/services/astrology/app/lambda_handler.py" "$artifact_dir/calculator-package/app/lambda_handler.py"
python3 -m pip install \
  --requirement "$project_dir/services/astrology/requirements-runtime.txt" \
  --target "$artifact_dir/calculator-package" \
  --platform manylinux2014_aarch64 \
  --implementation cp \
  --python-version 3.13 \
  --abi cp313 \
  --only-binary=:all: \
  --upgrade \
  --cache-dir /tmp/astroai-pip-cache
(
  cd "$artifact_dir/calculator-package"
  zip -qr "$artifact_dir/calculator.zip" .
)

echo "Created build/api.zip and build/calculator.zip"
