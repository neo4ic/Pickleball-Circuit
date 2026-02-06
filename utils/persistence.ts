
import { Event } from '../types';

const STORAGE_KEY = 'pb_events_v1';

export function saveEvent(event: Event) {
  const events = getStoredEvents();
  events[event.id] = event;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function deleteEvent(id: string) {
  const events = getStoredEvents();
  delete events[id];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  localStorage.removeItem(`host_token_${id}`);
}

export function getStoredEvents(): Record<string, Event> {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {};
}

export function getEvent(id: string): Event | null {
  const events = getStoredEvents();
  return events[id] || null;
}

export function generateEventShareUrl(event: Event): string {
  // Use the current URL minus existing hashes to ensure it works on any domain
  const baseUrl = window.location.href.split('#')[0];
  // Ensure we don't end up with double slashes if baseUrl has one
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBase}/#/event/${event.id}`;
}

export function setHostToken(eventId: string, token: string) {
  localStorage.setItem(`host_token_${eventId}`, token);
}

export function getHostToken(eventId: string): string | null {
  return localStorage.getItem(`host_token_${eventId}`);
}