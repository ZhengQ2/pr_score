#!/usr/bin/env bash
# Publish dist/ to https://pr.zhengqiu.net. Creates or updates the CloudFormation stack, syncs files and
# invalidates CloudFront. Requires AWS CLI credentials for the account that owns the zhengqiu.net zone.
# SKIP_STACK=1 skips the CloudFormation update (files only), as the GitHub deploy workflow does.
set -euo pipefail
STACK=${STACK:-pr-score-site}
DOMAIN=${DOMAIN:-pr.zhengqiu.net}
ZONE_ID=${ZONE_ID:-Z04041771VDZVIDEBKKBM}
export AWS_REGION=us-east-1 # CloudFront certificates must live in us-east-1
cd "$(dirname "$0")/.."

npm test >/dev/null
npm run check >/dev/null

# SKIP_STACK=1 (used by CI) only uploads files; stack changes need the owner's full credentials.
if [[ -z "${SKIP_STACK:-}" ]]; then
  aws cloudformation deploy --stack-name "$STACK" --template-file infra/site.yaml \
    --parameter-overrides DomainName="$DOMAIN" HostedZoneId="$ZONE_ID" --no-fail-on-empty-changeset
fi
out(){ aws cloudformation describe-stacks --stack-name "$STACK" --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text; }
BUCKET=$(out BucketName); DIST=$(out DistributionId)

# Short cache for code so rule updates reach users quickly; the large NOC dataset changes rarely.
aws s3 sync dist "s3://$BUCKET" --delete --exclude noc-2021.json --cache-control 'public, max-age=300'
aws s3 cp dist/noc-2021.json "s3://$BUCKET/noc-2021.json" --cache-control 'public, max-age=86400' --content-type application/json
aws cloudfront create-invalidation --distribution-id "$DIST" --paths '/*' --query Invalidation.Id --output text
echo "Deployed https://$DOMAIN"
