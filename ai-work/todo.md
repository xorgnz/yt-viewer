# TODO

3. Rename ambiguous `channels` references to `sourceChannels` throughout the codebase where they refer to source channels rather than virtual channels.
4. Ensure all fields containing virtualchanneltimers are named accordingly (many are called just virtualchannel)
5. Refactor page-facing services so they own both payload packaging and serialization; remove page-only runtime wrapper objects that exist solely to pass into `+page.server.ts` for immediate serialization.
