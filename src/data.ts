import type { CaseWorkflowRecord } from "./CaseWorkflow";
import type { ConditionWorkflowRecord } from "./ConditionWorkflow";
import {
  demoCases,
  demoCompanies,
  demoConditions,
  demoDimensions,
} from "./mockData";

export type CaseStatus = CaseWorkflowRecord["status"];
export type ConditionStatus = ConditionWorkflowRecord["status"];

export const cases = demoCases;
export const companies = demoCompanies;
export const conditions = demoConditions;
export const dimensions = demoDimensions;
