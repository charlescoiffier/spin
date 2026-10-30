import { RecordStore } from "./RecordStore";
import { CourseStore } from "../../editor/CourseStore";
let records: RecordStore | undefined, custom: CourseStore | undefined;
function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
export function getRecords(): RecordStore {
  return (records ??= new RecordStore(storage()));
}
export function getCourseStore(): CourseStore {
  return (custom ??= new CourseStore(storage()));
}
