import { HARVEST_ACCESS_TOKEN, HARVEST_ACCOUNT_ID } from './constants'
import { HARVEST_API_URL, TimeEntry, TimeEntryResponse } from './types'

const ui = SpreadsheetApp.getUi()
ui.createMenu('Import Harvest Data')
	.addItem('Import Harvest Data', 'importTimeEntries')
	.addToUi()

function importTimeEntries() {
	const today = Utilities.formatDate(new Date(), 'GMT-7', 'yyyy/MM/dd')
	const timeEntries = fetchHarvestTimeEntries(today, today)
	if (!timeEntries) {
		throw new Error('No time entries for today')
	}

	appendTimeEntriesToSheet(timeEntries)
}

function fetchHarvestTimeEntries(
	from: string,
	to: string,
): TimeEntry[] | undefined {
	const headers = {
		Authorization: `Bearer ${HARVEST_ACCESS_TOKEN}`,
		'Harvest-Account-ID': HARVEST_ACCOUNT_ID,
		'User-Agent': 'revenue-tracker-app-script (h.borges10592@gmail.com)',
	}

	const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
		method: 'get',
		headers: headers,
		muteHttpExceptions: true,
	}

	const response = UrlFetchApp.fetch(
		`${HARVEST_API_URL}?from=${from}&to=${to}`,
		options,
	)

	if (response.getResponseCode() === 200) {
		const timeEntries: TimeEntryResponse = JSON.parse(response.getContentText())
		return timeEntries.time_entries
	} else {
		console.error('Error fetching data: ', response.getContentText())
	}
}

function appendTimeEntriesToSheet(timeEntries: TimeEntry[]): void {
	const sheetName = 'Harvest Data'
	const ss = SpreadsheetApp.getActiveSpreadsheet()
	const sheet = ss.getSheetByName(sheetName)

	if (!sheet) {
		throw new Error(`Sheet "${sheetName}" not found`)
	}

	const existingIdsRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1) // Adjust if header is not in the first row
	const existingIds = existingIdsRange.getValues().flat()

	// Filter out entries that already exist in the sheet.
	const uniqueEntries = timeEntries.filter(
		(entry) => !existingIds.includes(entry.id),
	)

	if (uniqueEntries.length === 0) {
		return // No new entries to add
	}

	const entryRows = timeEntries.map((entry: TimeEntry) => [
		entry.id, // _harvest_id
		entry.spent_date, // Date
		entry.hours, // Hours
		entry.billable_rate, // Rate
	])

	const startRow = 2
	const startColumn = 1
	const numColumns = entryRows[0].length

	// Insert rows before the second row.
	sheet.insertRowsBefore(startRow, entryRows.length)

	// Set the new data at the beginning of the sheet after the header.
	sheet
		.getRange(startRow, startColumn, entryRows.length, numColumns)
		.setValues(entryRows)
}
