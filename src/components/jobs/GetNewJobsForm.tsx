import { useState, useEffect, useMemo, type SyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ContractTypeEnum,
  ExperienceLevelEnum,
  PublishedAtEnum,
  WorkTypeEnum,
} from "@dumitru_sirbu92/get-job-assistant-sdk";
import type { GetNewJobsParamsDto } from "@dumitru_sirbu92/get-job-assistant-sdk";
import { processNewJobs } from "@/lib/api/jobs";
import type { ProcessNewJobsResponse } from "@/lib/schemas";
import { getJobRegions } from "@/lib/api/lookups";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";

const CONTRACT_TYPE_LABELS: Record<ContractTypeEnum, string> = {
  [ContractTypeEnum.FULL_TIME]: "Full Time",
  [ContractTypeEnum.PART_TIME]: "Part Time",
  [ContractTypeEnum.CONTRACT]: "Contract",
  [ContractTypeEnum.TEMPORARY]: "Temporary",
  [ContractTypeEnum.INTERNSHIP]: "Internship",
  [ContractTypeEnum.VOLUNTEER]: "Volunteer",
};

const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevelEnum, string> = {
  [ExperienceLevelEnum.INTERNSHIP]: "Internship",
  [ExperienceLevelEnum.ENTRY_LEVEL]: "Entry Level",
  [ExperienceLevelEnum.ASSOCIATE]: "Associate",
  [ExperienceLevelEnum.MID_SENIOR]: "Mid-Senior",
  [ExperienceLevelEnum.DIRECTOR]: "Director",
};

const PUBLISHED_AT_LABELS: Record<PublishedAtEnum, string> = {
  [PublishedAtEnum.PAST_24_HOURS]: "Past 24 Hours",
  [PublishedAtEnum.PAST_WEEK]: "Past Week",
  [PublishedAtEnum.PAST_MONTH]: "Past Month",
};

const WORK_TYPE_LABELS: Record<WorkTypeEnum, string> = {
  [WorkTypeEnum.ON_SITE]: "On Site",
  [WorkTypeEnum.REMOTE]: "Remote",
  [WorkTypeEnum.HYBRID]: "Hybrid",
};

const DEFAULT_FORM = {
  title: "Node.js",
  contractType: ContractTypeEnum.FULL_TIME,
  experienceLevel: ExperienceLevelEnum.MID_SENIOR,
  publishedAt: PublishedAtEnum.PAST_24_HOURS,
  workType: WorkTypeEnum.REMOTE,
  jobRegionIds: [] as number[],
  rows: undefined as number | undefined,
};

export default function GetNewJobsForm({
  onSuccess,
}: {
  onSuccess?: (data: ProcessNewJobsResponse) => void;
} = {}) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const navigate = useNavigate();

  const { data: regionsData } = useQuery({
    queryKey: ["job-regions"],
    queryFn: getJobRegions,
  });

  const locations = useMemo(() => regionsData?.items ?? [], [regionsData?.items]);

  useEffect(() => {
    if (locations.length === 0) {
      return;
    }

    setForm((f) => {
      if (f.jobRegionIds.length > 0) {
        return f;
      }

      return {
        ...f,
        jobRegionIds: locations
          .filter((r) => r.isSelectedByDefault)
          .map((r) => r.id),
      };
    });
  }, [locations]);

  const mutation = useMutation({
    mutationFn: (params: GetNewJobsParamsDto) => processNewJobs(params),
    onSuccess: (data) => {
      if (onSuccess) {
        onSuccess(data);
      } else {
        navigate(`/jobs/scraping/${data.runId}`, {
          state: {
            totalLocations: data.totalLocations,
            locations: data.locations,
          },
        });
      }
    },
  });

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params: GetNewJobsParamsDto = {
      title: form.title,
      contractType: form.contractType,
      experienceLevel: form.experienceLevel,
      publishedAt: form.publishedAt,
      workType: form.workType,
      jobRegionIds: form.jobRegionIds,
      rows: form.rows,
    };
    mutation.mutate(params);
  };

  const canSubmit =
    form.title.trim().length > 0 &&
    form.jobRegionIds.length > 0 &&
    !mutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Job title</label>
        <Input
          placeholder="e.g. Software Engineer"
          value={form.title}
          onChange={(e) => {
            setForm((f) => ({ ...f, title: e.target.value }));
          }}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Contract type
          </label>
          <Select
            value={form.contractType}
            onValueChange={(v) => {
              setForm((f) => ({ ...f, contractType: v as ContractTypeEnum }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.values(ContractTypeEnum) as ContractTypeEnum[]).map(
                (v) => (
                  <SelectItem key={v} value={v}>
                    {CONTRACT_TYPE_LABELS[v]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Experience level
          </label>
          <Select
            value={form.experienceLevel}
            onValueChange={(v) => {
              setForm((f) => ({
                ...f,
                experienceLevel: v as ExperienceLevelEnum,
              }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.values(ExperienceLevelEnum) as ExperienceLevelEnum[]
              ).map((v) => (
                <SelectItem key={v} value={v}>
                  {EXPERIENCE_LEVEL_LABELS[v]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Published</label>
          <Select
            value={form.publishedAt}
            onValueChange={(v) => {
              setForm((f) => ({ ...f, publishedAt: v as PublishedAtEnum }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.values(PublishedAtEnum) as PublishedAtEnum[]).map(
                (v) => (
                  <SelectItem key={v} value={v}>
                    {PUBLISHED_AT_LABELS[v]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Work type</label>
          <Select
            value={form.workType}
            onValueChange={(v) => {
              setForm((f) => ({ ...f, workType: v as WorkTypeEnum }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.values(WorkTypeEnum) as WorkTypeEnum[]).map((v) => (
                <SelectItem key={v} value={v}>
                  {WORK_TYPE_LABELS[v]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Regions</label>
        <MultiSelect
          options={locations}
          value={form.jobRegionIds}
          onChange={(ids) => {
            setForm((f) => ({ ...f, jobRegionIds: ids }));
          }}
          placeholder="Select regions"
          className="w-full"
        />
        {form.jobRegionIds.length === 0 && (
          <p className="text-xs text-red-500">Select at least one region.</p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">
          Rows{" "}
          <span className="text-gray-400 font-normal">(optional, 1–1000)</span>
        </label>
        <Input
          type="number"
          min={1}
          max={1000}
          placeholder="Default"
          value={form.rows ?? ""}
          onChange={(e) => {
            const v = e.target.value ? Number(e.target.value) : undefined;
            setForm((f) => ({ ...f, rows: v }));
          }}
          className="w-40"
        />
      </div>

      {mutation.isError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Failed to queue jobs."}
        </div>
      )}

      <Button type="submit" disabled={!canSubmit}>
        {mutation.isPending ? "Queuing…" : "Get New Jobs"}
      </Button>
    </form>
  );
}
