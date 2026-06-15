import { google } from "googleapis";
import type { CalendarTaskDue } from "@/lib/calendar";
import { createGoogleOAuth2Client } from "@/lib/server/googleOAuthClient";
import { logError } from "@/lib/server/logger";

export async function fetchDueTasksInRange(
  rangeStart: Date,
  rangeEnd: Date
): Promise<CalendarTaskDue[]> {
  const auth = createGoogleOAuth2Client();
  if (!auth) return [];

  const tasksApi = google.tasks({ version: "v1", auth });
  const dueMin = rangeStart.toISOString();
  const dueMax = rangeEnd.toISOString();
  const results: CalendarTaskDue[] = [];

  try {
    const listsRes = await tasksApi.tasklists.list({ maxResults: 20 });
    const lists = listsRes.data.items ?? [];

    for (const list of lists) {
      if (!list.id) continue;

      let pageToken: string | undefined;
      do {
        const res = await tasksApi.tasks.list({
          tasklist: list.id,
          showCompleted: false,
          showHidden: false,
          dueMin,
          dueMax,
          maxResults: 100,
          pageToken,
        });

        for (const task of res.data.items ?? []) {
          if (!task.title?.trim() || !task.due) continue;
          results.push({
            id: task.id ?? `${list.id}-${task.title}`,
            title: task.title.trim(),
            due: task.due,
          });
        }

        pageToken = res.data.nextPageToken ?? undefined;
      } while (pageToken);
    }
  } catch (err) {
    logError("google-tasks.fetch", err);
    return [];
  }

  return results;
}
