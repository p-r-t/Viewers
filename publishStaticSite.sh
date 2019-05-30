#!/bin/bash

# Set directory to location of this script
# https://stackoverflow.com/a/3355423/1867984
cd "$(dirname "$0")"

echo 'PUBLISHING'

./node_modules/.bin/gh-pages \
  --silent \
  --repo https://$GITHUB_TOKEN@github.com/OHIF/Viewers.git \
	--dist docs/latest/_book
