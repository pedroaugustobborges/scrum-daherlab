import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Edge Function: calendar-feed
 *
 * Serves Agir Agil events as a live ICS feed that can be subscribed to by
 * Outlook, Google Calendar, or other calendar applications.
 *
 * Usage: GET /calendar-feed?token=<user_calendar_token>
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Format date for ICS (YYYYMMDD for all-day events)
function formatICSDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

// Format datetime for ICS DTSTAMP (YYYYMMDDTHHMMSSZ)
function formatICSDateTime(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

// Escape text for ICS format
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// Add days to a date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

interface CalendarEvent {
  uid: string;
  summary: string;
  dtstart: Date;
  description?: string;
  categories?: string;
}

function generateICSContent(events: CalendarEvent[], calendarName: string): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Agir Agil//Calendar Feed//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeICSText(calendarName)}`,
    "X-WR-TIMEZONE:America/Sao_Paulo",
  ];

  const now = new Date();

  for (const event of events) {
    const dtstamp = formatICSDateTime(now);
    const dtstart = formatICSDate(event.dtstart);
    // ICS DTEND for all-day events is exclusive (day after the event day)
    const dtend = formatICSDate(addDays(event.dtstart, 1));

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
    lines.push(`DTEND;VALUE=DATE:${dtend}`);
    lines.push(`SUMMARY:${escapeICSText(event.summary)}`);
    lines.push("TRANSP:TRANSPARENT"); // Show as "free" - doesn't block time
    lines.push("X-MICROSOFT-CDO-BUSYSTATUS:FREE"); // Outlook-specific

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
    }

    if (event.categories) {
      lines.push(`CATEGORIES:${event.categories}`);
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate token and get user
    const { data: tokenData, error: tokenError } = await supabase
      .from("calendar_feed_tokens")
      .select("user_id, is_active")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData || !tokenData.is_active) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = tokenData.user_id;

    // Fetch user's tasks
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        status,
        priority,
        due_date,
        start_date,
        end_date,
        assigned_to,
        project_id,
        projects(name)
      `)
      .or("start_date.not.is.null,end_date.not.is.null,due_date.not.is.null");

    if (tasksError) {
      console.error("[calendar-feed] Tasks error:", tasksError);
      throw new Error("Failed to fetch tasks");
    }

    // Fetch sprints
    const { data: sprints, error: sprintsError } = await supabase
      .from("sprints")
      .select(`
        id,
        name,
        start_date,
        end_date,
        status,
        project_id,
        projects(name)
      `)
      .not("start_date", "is", null);

    if (sprintsError) {
      console.error("[calendar-feed] Sprints error:", sprintsError);
      throw new Error("Failed to fetch sprints");
    }

    // Helper to check if two dates are the same day
    const isSameDay = (d1: Date, d2: Date): boolean => {
      return d1.getFullYear() === d2.getFullYear() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getDate() === d2.getDate();
    };

    // Build calendar events
    const calendarEvents: CalendarEvent[] = [];

    // Add tasks
    for (const task of tasks || []) {
      const project = task.projects as { name: string } | null;
      const descriptionParts: string[] = [];
      if (project?.name) descriptionParts.push(`Projeto: ${project.name}`);
      if (task.status) descriptionParts.push(`Status: ${task.status}`);
      if (task.priority) descriptionParts.push(`Prioridade: ${task.priority}`);

      const startDate = task.start_date ? new Date(task.start_date) : null;
      const endDate = task.end_date ? new Date(task.end_date) : null;

      // Task with date range - create separate start/end events
      if (startDate && endDate && !isSameDay(startDate, endDate)) {
        // Different days - create start and end events
        calendarEvents.push({
          uid: `task-${task.id}-start@agiragil.app`,
          summary: `Início: ${task.title}`,
          dtstart: startDate,
          description: descriptionParts.join("\\n"),
          categories: "Tarefa",
        });

        calendarEvents.push({
          uid: `task-${task.id}-end@agiragil.app`,
          summary: `Término: ${task.title}`,
          dtstart: endDate,
          description: descriptionParts.join("\\n"),
          categories: "Tarefa",
        });
      } else if (startDate && endDate && isSameDay(startDate, endDate)) {
        // Same day - single event
        calendarEvents.push({
          uid: `task-${task.id}@agiragil.app`,
          summary: task.title,
          dtstart: startDate,
          description: descriptionParts.join("\\n"),
          categories: "Tarefa",
        });
      } else if (startDate && !endDate) {
        // Only start date
        calendarEvents.push({
          uid: `task-${task.id}-start@agiragil.app`,
          summary: `Início: ${task.title}`,
          dtstart: startDate,
          description: descriptionParts.join("\\n"),
          categories: "Tarefa",
        });
      } else if (!startDate && endDate) {
        // Only end date
        calendarEvents.push({
          uid: `task-${task.id}-end@agiragil.app`,
          summary: `Término: ${task.title}`,
          dtstart: endDate,
          description: descriptionParts.join("\\n"),
          categories: "Tarefa",
        });
      }

      // Due date as deadline
      if (task.due_date) {
        const dueDate = new Date(task.due_date);

        calendarEvents.push({
          uid: `deadline-${task.id}@agiragil.app`,
          summary: `Prazo: ${task.title}`,
          dtstart: dueDate,
          description: descriptionParts.join("\\n"),
          categories: "Prazo",
        });
      }
    }

    // Add sprints
    for (const sprint of sprints || []) {
      const project = sprint.projects as { name: string } | null;
      const descriptionParts: string[] = [];
      if (project?.name) descriptionParts.push(`Projeto: ${project.name}`);
      if (sprint.status) descriptionParts.push(`Status: ${sprint.status}`);

      const startDate = new Date(sprint.start_date);
      const endDate = sprint.end_date ? new Date(sprint.end_date) : null;

      if (endDate && !isSameDay(startDate, endDate)) {
        // Different days - create start and end events
        calendarEvents.push({
          uid: `sprint-${sprint.id}-start@agiragil.app`,
          summary: `Início: ${sprint.name}`,
          dtstart: startDate,
          description: descriptionParts.join("\\n"),
          categories: "Sprint",
        });

        calendarEvents.push({
          uid: `sprint-${sprint.id}-end@agiragil.app`,
          summary: `Fim: ${sprint.name}`,
          dtstart: endDate,
          description: descriptionParts.join("\\n"),
          categories: "Sprint",
        });
      } else {
        // Same day or no end date - single event
        calendarEvents.push({
          uid: `sprint-${sprint.id}@agiragil.app`,
          summary: sprint.name,
          dtstart: startDate,
          description: descriptionParts.join("\\n"),
          categories: "Sprint",
        });
      }
    }

    // Generate ICS content
    const icsContent = generateICSContent(calendarEvents, "Agir Agil - Calendario");

    console.log(`[calendar-feed] Generated ICS with ${calendarEvents.length} events`);

    // Return ICS content - NO attachment disposition so calendars can subscribe
    return new Response(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        // Allow caching for 5 minutes to reduce load, but not too long for updates
        "Cache-Control": "public, max-age=300",
        // CORS headers for browser access
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  } catch (error) {
    console.error("[calendar-feed] Error:", error);
    // Return a valid empty ICS on error (some clients fail on non-ICS responses)
    const emptyICS = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Agir Agil//Calendar Feed//PT",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Agir Agil - Erro",
      "END:VCALENDAR",
    ].join("\r\n");

    return new Response(emptyICS, {
      status: 200, // Return 200 with empty calendar instead of error
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
