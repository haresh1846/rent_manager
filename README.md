# Rent Manager

Rent Manager keeps a personal rental ledger on this computer. It opens directly to an empty personal workspace on first use. You can add and edit properties and tenants, create leases, record rent, apply advances, and track maintenance. The dashboard and reports show the resulting balances.

## Open the app

From the folder containing this README, run:

```sh
npm start
```

Open [Rent Manager on this computer](http://127.0.0.1:8204/). Bookmark this address and use the same browser profile each time. The server listens on this computer's loopback interface. The app stores records in that browser’s IndexedDB. Closing the browser, stopping the server with Ctrl+C, and rebuilding the app preserve those records. Clearing site data or deleting the browser profile removes them.

The launcher uses the installed Node and Expo tools. It builds the web app when the source changes or the export is missing, then serves the files from `dist/`. On this checkout, the dependencies are already installed. After a fresh checkout, install Node 24.15 or a compatible version and run `npm ci` once to obtain the dependencies. Starting and using the installed app works offline.

## Personal and sample workspaces

To get started with your own records, add a property, add a tenant, then create a lease linking them. Record a payment against that lease and open Reports to check the rent collected for its billing month.

For sample records, open **Settings → Explore sample workspace**. Its first use creates three properties, two tenants, two leases, and two payments. Edits from an earlier local demo are preserved. Choose **Open personal workspace** in Settings to return to your own records. Each workspace is saved separately.

Amounts are in Indian rupees. Each calendar month touched by a lease carries one full installment, including its first and last months. Rent counts toward the selected billing month. Advance remains on the lease until explicitly applied to rent.

## Back up and restore

Open **Settings → Export backup** to save a JSON file containing the current workspace’s properties, tenants, leases, payments, and maintenance records. The file includes tenant contact details and financial records in plain text. Keep it in a private local folder.

To recover records, open the matching personal or sample workspace, choose **Restore from file**, and review the date and record counts. **Replace workspace records** replaces that workspace with the contents of the file. You can cancel at the preview or export your current records before starting.

## Development

```sh
npm run typecheck
npm run lint
npm test
```

`npm run build:web` regenerates the web export using the installed Expo CLI. `npm run dev` starts the local development server for code changes. Use the bookmarked address above for everyday work because browser storage belongs to the exact URL origin.
