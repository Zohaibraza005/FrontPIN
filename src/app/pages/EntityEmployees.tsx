import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Globe,
  MapPin,
  RefreshCw,
  Search,
  Shuffle,
  Users,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { MoveEmployeesDialog } from "../components/entities/MoveEmployeesDialog";
import { API_URL, entityAPI } from "../services/api";
import { avatarColor } from "../utils/avatar";

const th = "h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400";

// Active employees of one entity, laid out like the Employees page
export const EntityEmployees: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [entity, setEntity] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [selected, setSelected] = useState<number[]>([]);
  const [moveOpen, setMoveOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await entityAPI.getEntityEmployees(id);
      setEntity(res?.data?.entity || null);
      setEmployees(res?.data?.employees || []);
      setSelected([]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    entityAPI
      .getEntities()
      .then((res: any) => setEntities(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // filter options from the people in this entity
  const departmentOptions = useMemo(() => {
    const m = new Map<string, string>();
    employees.forEach((e) => e.department?.id && m.set(String(e.department.id), e.department.title));
    return [{ value: "all", label: "All Departments" }, ...[...m].map(([value, label]) => ({ value, label }))];
  }, [employees]);
  const locationOptions = useMemo(() => {
    const m = new Map<string, string>();
    employees.forEach((e) => e.company?.id && m.set(String(e.company.id), e.company.name));
    return [{ value: "all", label: "All Locations" }, ...[...m].map(([value, label]) => ({ value, label }))];
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (filterDepartment !== "all" && String(e.department?.id || "") !== filterDepartment) return false;
      if (filterLocation !== "all" && String(e.company?.id || "") !== filterLocation) return false;
      if (!q) return true;
      return [`${e.firstName} ${e.lastName || ""}`, e.employeeId, e.biometricId, e.email, e.department?.title, e.jobInfo?.designation]
        .some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [employees, search, filterDepartment, filterLocation]);

  useEffect(() => setCurrentPage(1), [search, filterDepartment, filterLocation, itemsPerPage]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
  const page = Math.min(currentPage, totalPages);
  const start = (page - 1) * itemsPerPage;
  const rows = filtered.slice(start, start + itemsPerPage);
  const isFiltered = Boolean(search || filterDepartment !== "all" || filterLocation !== "all");

  const allPageSelected = rows.length > 0 && rows.every((e) => selected.includes(e.id));
  const togglePage = () =>
    setSelected((prev) =>
      allPageSelected ? prev.filter((x) => !rows.some((e) => e.id === x)) : [...new Set([...prev, ...rows.map((e) => e.id)])]
    );
  const toggle = (empId: number) =>
    setSelected((prev) => (prev.includes(empId) ? prev.filter((x) => x !== empId) : [...prev, empId]));

  const resetFilters = () => {
    setSearch("");
    setFilterDepartment("all");
    setFilterLocation("all");
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-1 sm:p-2">
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/entities")}
            className="size-9 rounded-xl shrink-0 border-gray-200 dark:border-gray-800"
            title="Back to entities"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 truncate">{entity?.name || "Entity"}</h2>
              {entity?.code && (
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
                  {entity.code}
                </span>
              )}
              <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 font-semibold px-2 py-0.5 text-xs rounded-md tabular-nums">
                {filtered.length} {filtered.length === employees.length ? "Active Staff" : `of ${employees.length} Active Staff`}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Active employees of this entity (separated employees are not shown)
              {entity?.company?.name ? ` · ${entity.company.name}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <Button
            variant="outline"
            size="icon"
            onClick={load}
            className="h-9 w-9 text-gray-600 hover:text-gray-900 border-gray-200 dark:border-gray-800 rounded-xl"
            title="Refresh"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            onClick={() => setMoveOpen(true)}
            disabled={!employees.length}
            className="shrink-0 h-9 px-3.5 text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-2xs rounded-xl"
          >
            <Shuffle className="size-3.5" />
            {selected.length ? `Move ${selected.length} selected` : "Move Employees"}
          </Button>
        </div>
      </div>

      <Card className="gap-0 shadow-lg border-gray-200/80 dark:border-gray-800 rounded-2xl overflow-hidden max-w-full">
        {/* ── Toolbar ── */}
        <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 py-3 px-4 sm:px-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-2.5">
            <SearchableSelect
              className="w-[165px] h-9 rounded-xl"
              icon={<Building2 className="w-3.5 h-3.5 text-gray-400" />}
              placeholder="Department"
              searchPlaceholder="Search dept..."
              value={filterDepartment}
              onValueChange={setFilterDepartment}
              options={departmentOptions}
            />
            <SearchableSelect
              className="w-[165px] h-9 rounded-xl"
              icon={<MapPin className="w-3.5 h-3.5 text-gray-400" />}
              placeholder="Location"
              searchPlaceholder="Search location..."
              value={filterLocation}
              onValueChange={setFilterLocation}
              options={locationOptions}
            />
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search name, ID, email, designation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm rounded-xl bg-white dark:bg-gray-950"
              />
            </div>
            {isFiltered && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-4">
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950">
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow className="bg-gray-50/80 dark:bg-gray-900/60 hover:bg-gray-50/80">
                    <TableHead className="w-10 pl-4">
                      <Checkbox checked={allPageSelected} onCheckedChange={togglePage} aria-label="Select page" />
                    </TableHead>
                    <TableHead className={th}>Employee</TableHead>
                    <TableHead className={th}>Department & Location</TableHead>
                    <TableHead className={th}>Position</TableHead>
                    <TableHead className={th}>Join Date</TableHead>
                    <TableHead className={th}>Login Access</TableHead>
                    <TableHead className={`${th} text-right pr-4`}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-40 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="size-6 animate-spin text-sky-500" />
                          <span className="text-sm font-medium">Loading employee records...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-40 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Users className="size-9 text-gray-300 mb-1" />
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No employees found</p>
                          <p className="text-xs text-gray-400">
                            {isFiltered ? "No employee matches your filters." : "This entity has no active employees."}
                          </p>
                          {isFiltered && (
                            <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2 text-xs">
                              Clear Filters
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((emp) => {
                      const empName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Unnamed";
                      const joinDate = emp.jobInfo?.hiringDate?.split("T")[0] || "N/A";
                      const initials = `${emp.firstName?.[0] || "E"}${emp.lastName?.[0] || ""}`.toUpperCase();
                      return (
                        <TableRow key={emp.id} className="hover:bg-blue-50/40 dark:hover:bg-gray-900/40 transition-colors">
                          <TableCell className="pl-4 py-3">
                            <Checkbox checked={selected.includes(emp.id)} onCheckedChange={() => toggle(emp.id)} aria-label={`Select ${empName}`} />
                          </TableCell>

                          <TableCell className="py-3">
                            <div className="flex items-center gap-3">
                              {emp.profileImage ? (
                                <img
                                  src={emp.profileImage.startsWith("http") ? emp.profileImage : `${API_URL}${emp.profileImage}`}
                                  alt={empName}
                                  className="size-9 rounded-full border border-gray-200 object-cover shrink-0"
                                />
                              ) : (
                                <div className={`size-9 rounded-full font-semibold text-xs flex items-center justify-center shrink-0 ${avatarColor(empName)}`}>
                                  {initials}
                                </div>
                              )}
                              <div>
                                <Link
                                  to={`/employees/${emp.id}`}
                                  className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 transition-colors leading-snug block"
                                >
                                  {empName}
                                </Link>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400">{emp.employeeId || `#${emp.id}`}</span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-sm text-gray-800 dark:text-gray-200 font-medium">
                                <Building2 className="size-3.5 text-gray-400 shrink-0" />
                                <span>{emp.department?.title || "Unassigned"}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <MapPin className="size-3 text-gray-400 shrink-0" />
                                <span>{emp.company?.name || "Head Office"}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Globe className="size-3 text-gray-400 shrink-0" />
                                <span>{entity?.name}</span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                              {emp.jobInfo?.designation || "Staff Member"}
                            </span>
                          </TableCell>

                          <TableCell className="py-3">
                            <span className="text-sm text-gray-700 dark:text-gray-300 tabular-nums">{joinDate}</span>
                          </TableCell>

                          <TableCell className="py-3">
                            {emp.canLogin ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Can login
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                No access
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="pr-4 py-3 text-right">
                            <Link to={`/employees/${emp.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 text-xs gap-1.5 rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                              >
                                <Eye className="size-3.5" />
                                View
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* ── Pagination ── */}
            {total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    Showing <strong className="text-gray-700 dark:text-gray-200">{start + 1}</strong> to{" "}
                    <strong className="text-gray-700 dark:text-gray-200">{Math.min(start + itemsPerPage, total)}</strong> of{" "}
                    <strong className="text-gray-700 dark:text-gray-200">{total}</strong> employees
                    {selected.length > 0 && <> · <strong className="text-blue-600">{selected.length} selected</strong></>}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="hidden sm:inline">Rows per page:</span>
                    <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
                      <SelectTrigger className="h-8 w-[72px] text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent side="top">
                        {[10, 20, 50, 100].map((n) => (
                          <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2.5 text-xs font-semibold rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    Previous
                  </Button>
                  <span className="px-2 text-xs text-gray-500 tabular-nums">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-2.5 text-xs font-semibold rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <MoveEmployeesDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        entities={entities}
        fromEntityId={id}
        preselectedIds={selected}
        onMoved={load}
      />
    </div>
  );
};
