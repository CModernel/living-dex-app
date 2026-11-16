# Privacy

Living Dex is a fan-made, unofficial app. This is what it keeps and where (TODO 3.44).

**Without an account** (the default, and the only mode of the community edition): your collections live in this browser's
storage on this device. Nothing is sent anywhere. Pokémon data and sprites are downloaded from public sources (PokeAPI,
PokeJungle, the Living Dex dataset on jsDelivr); those requests carry no personal data.

**With an account** (hosted edition, optional):
- Stored: your email address (to sign you in, by magic link or Google) and your collections (to sync them between devices).
  Columns, theme and which list is open stay on each device.
- Where: this app's own Supabase project (database + sign-in), not shared with any other app. Row level security lets
  each account read and write only its own rows.
- Not done: no ads, no analytics or tracking, nothing sold or shared.
- Your control: Settings → Data → **Export** downloads everything as a file at any time. Settings → Cloud sync →
  **Delete account** removes the account and all its cloud data at once (the collections on the device stay there).
