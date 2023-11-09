import { HARVEST_ACCESS_TOKEN, HARVEST_ACCOUNT_ID } from './constants'
import { TimeEntry, TimeEntryResponse } from './types'

const baseUrl = 'https://api.harvestapp.com/v2/time_entries'

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

	const url = `${baseUrl}?from=${from}&to=${to}`

	const response = UrlFetchApp.fetch(baseUrl, options)

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
	const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName)

	const dataToAppend = timeEntries.map((entry: TimeEntry) => [
		entry.id, // _harvest_id
		entry.spent_date, // Date
		entry.hours, // Hours
		entry.billable_rate, // Rate
	])

	let startRow = 2
	let range = sheet.getRange(startRow, 1)
	while (range.getValue() && startRow < sheet.getMaxRows()) {
		startRow++
		range = sheet.getRange(startRow, 1)
	}

	if (dataToAppend.length > 0) {
		const startColumn = 1 // Column A for _harvest_id
		const numRows = dataToAppend.length
		const numColumns = dataToAppend[0].length // Should be 4 now (ID, Date, Hours, Rate)

		sheet
			.getRange(startRow, startColumn, numRows, numColumns)
			.setValues(dataToAppend)
	}
}
