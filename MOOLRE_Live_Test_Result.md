# Moolre live collection test — 23 August 2026

A user-authorized test collection was attempted for GH₵2.00 on the supplied MTN test number.

## Result

- Moolre request reached the API.
- Moolre returned `status: 0`, code `AIN01`, message `Authentication Error`.
- No successful collection request was created.
- No Mobile Money prompt should have been sent.
- No charge was initiated.

## Required next action

In the Moolre dashboard, confirm:

1. API access is activated for the specified Moolre account.
2. `X-API-USER` is the correct API username.
3. `X-API-PUBKEY` is the active public API key for the same account.
4. The account number belongs to the API-enabled merchant wallet.
5. The account is enabled for MTN collections.
6. The environment is correct: live credentials must be sent to the live base URL; sandbox credentials to the sandbox base URL.

After refreshed credentials are configured, repeat a single controlled GH₵2.00 test.
