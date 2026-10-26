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
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { MoveDepartmentEmployeesDialog } from "../components/departments/MoveDepartmentEmployeesDialog";
import { API_URL, departmentAPI } from "../services/api";
import { avatarColor } from "../utils/avatar";

const th = "h-10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400";

export const DepartmentEmployees: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [department, setDepartment] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterEntity, setFilterEntity] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [selected, setSelected] = useState<number[]>([]);
  const [moveOpen, setMoveOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await departmentAPI.getDepartmentEmployees(id);
      setDepartment(res?.data?.department || null);
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
    departmentAPI
      .getDepartments()
      .then((res: any) => setDepartments(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // filter options from the people in this department
  const entityOptions = useMemo(() => {
    const m = new Map<string, string>();
    employees.forEach((e) => e.entity?.id && m.set(String(e.entity.id), e.entity.name || e.entity.title));
    return [{ value: "all", label: "All Entities" }, ...[...m].map(([value, label]) => ({ value, label }))];
  }, [employees]);

  const locationOptions = useMemo(() => {
    const m = new Map<string, string>();
    employees.forEach((e) => e.company?.id && m.set(String(e.company.id), e.company.name));
    return [{ value: "all", label: "All Locations" }, ...[...m].map(([value, label]) => ({ value, label }))];
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (filterEntity !== "all" && String(e.entity?.id || e.entityId || "") !== filterEntity) return false;
      if (filterLocation !== "all" && String(e.company?.id || e.companyId || "") !== filterLocation) return false;
      if (!q) return true;
      return [
        `${e.firstName} ${e.lastName || ""}`,
        e.employeeId,
        e.biometricId,
        e.email,
        e.entity?.name,
        e.jobInfo?.designation,
      ].some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [employees, search, filterEntity, filterLocation]);

  useEffect(() => setCurrentPage(1), [search, filterEntity, filterLocation, itemsPerPage]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
  const page = Math.min(currentPage, totalPages);
  const start = (page - 1) * itemsPerPage;
  const rows = filtered.slice(start, start + itemsPerPage);
  const isFiltered = Boolean(search || filterEntity !== "all" || filterLocation !== "all");

  const allVisibleSelected = rows.length > 0 && rows.every((e) => selected.includes(e.id));
  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setSelected((prev) => prev.filter((id) => !rows.some((e) => e.id === id)));
    } else {
      setSelected((prev) => [...new Set([...prev, ...rows.map((e) => e.id)])]);
    }
  };
  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const resetFilters = () => {
    setSearch("");
    setFilterEntity("all");
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
            onClick={() => navigate("/departments")}
            className="size-9 rounded-xl shrink-0 border-gray-200 dark:border-gray-800"
            title="Back to departments"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 truncate">
                {department?.title || "Department"}
              </h2>
              <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 font-semibold px-2 py-0.5 text-xs rounded-md tabular-nums">
                {filtered.length} {filtered.length === employees.length ? "Active Staff" : `of ${employees.length} Active Staff`}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Active employees of this department (separated employees are not shown)
              {department?.company?.name ? ` · ${department.company.name}` : ""}
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
            {entityOptions.length > 1 && (
              <SearchableSelect
                className="w-[165px] h-9 rounded-xl"
                icon={<Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                placeholder="All Entities"
                searchPlaceholder="Search entity..."
                value={filterEntity}
                onValueChange={setFilterEntity}
                options={entityOptions}
              />
            )}

            {locationOptions.length > 1 && (
              <SearchableSelect
                className="w-[165px] h-9 rounded-xl"
                icon={<MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                placeholder="All Locations"
                searchPlaceholder="Search location..."
                value={filterLocation}
                onValueChange={setFilterLocation}
                options={locationOptions}
              />
            )}

            <div className="relative flex-1 min-w-[200px] sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, ID, email, designation..."
                className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-white dark:bg-gray-950 rounded-xl border-gray-200 dark:border-gray-800"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-9 px-2.5 text-xs text-blue-600 hover:text-blue-800"
              >
                Reset
              </Button>
            )}
          </div>
        </CardHeader>

        {/* ── Table ── */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 dark:bg-gray-900/60 hover:bg-gray-50/80">
                  <TableHead className="w-10 pl-4 pr-1">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={toggleAllVisible}
                      aria-label="Select all on this page"
                    />
                  </TableHead>
                  <TableHead className={`${th} pl-2`}>EMPLOYEE</TableHead>
                  <TableHead className={th}>DEPARTMENT & LOCATION</TableHead>
                  <TableHead className={th}>POSITION</TableHead>
                  <TableHead className={th}>JOIN DATE</TableHead>
                  <TableHead className={th}>LOGIN ACCESS</TableHead>
                  <TableHead className={`${th} text-right pr-6`}>ACTION</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center text-gray-400 text-sm">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="size-5 animate-spin text-blue-600" />
                        <span>Loading employees...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center text-gray-400 text-sm">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="size-8 text-gray-300" />
                        <span className="font-medium text-gray-600 dark:text-gray-300">
                          {isFiltered ? "No employees match your search" : "No active employees in this department"}
                        </span>
                        {isFiltered && (
                          <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs mt-1">
                            Clear Filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((emp) => {
                    const name = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Unnamed";
                    const code = emp.employeeId || (emp.id ? `#${emp.id}` : "—");
                    const initials = (name.slice(0, 2) || "EM").toUpperCase();
                    const color = avatarColor(name);
                    const position = emp.jobInfo?.designation || "Staff Member";
                    const joinDate = emp.jobInfo?.hiringDate?.slice(0, 10) || "—";
                    const deptName = emp.department?.title || department?.title || "—";
                    const locName = emp.company?.name || department?.company?.name || "—";
                    const entName = emp.entity?.name || null;

                    return (
                      <TableRow key={emp.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-900/40 transition-colors">
                        {/* Checkbox */}
                        <TableCell className="pl-4 pr-1">
                          <Checkbox
                            checked={selected.includes(emp.id)}
                            onCheckedChange={() => toggle(emp.id)}
                            aria-label={`Select ${name}`}
                          />
                        </TableCell>

                        {/* Employee */}
                        <TableCell className="pl-2 py-3">
                          <div className="flex items-center gap-3">
                            {emp.profileImage ? (
                              <img
                                src={emp.profileImage.startsWith("http") ? emp.profileImage : `${API_URL}${emp.profileImage}`}
                                alt={name}
                                className="size-9 rounded-full object-cover border border-gray-200 dark:border-gray-800 shrink-0"
                              />
                            ) : (
                              <div className={`size-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${color}`}>
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0">
                              <Link
                                to={`/employees/${emp.id}`}
                                className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 truncate block"
                              >
                                {name}
                              </Link>
                              <p className="text-xs text-gray-400 font-mono">
                                {code}
                                {emp.biometricId ? ` · BIO-${emp.biometricId}` : ""}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Dept & Location */}
                        <TableCell className="py-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-gray-800 dark:text-gray-200 font-medium">
                              <Building2 className="size-3 text-gray-400 shrink-0" />
                              <span className="truncate">{deptName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                              <MapPin className="size-3 text-gray-400 shrink-0" />
                              <span className="truncate">{locName}</span>
                            </div>
                            {entName && (
                              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                <Globe className="size-3 text-gray-400 shrink-0" />
                                <span className="truncate">{entName}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Position */}
                        <TableCell className="py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900">
                            {position}
                          </span>
                        </TableCell>

                        {/* Join Date */}
                        <TableCell className="py-3 text-xs text-gray-600 dark:text-gray-400 font-mono">
                          {joinDate}
                        </TableCell>

                        {/* Login Access */}
                        <TableCell className="py-3">
                          {emp.canLogin ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full dark:bg-emerald-950/50 dark:text-emerald-300">
                              <span className="size-1.5 rounded-full bg-emerald-500" />
                              Can login
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full dark:bg-gray-800 dark:text-gray-400">
                              <span className="size-1.5 rounded-full bg-gray-400" />
                              No login
                            </span>
                          )}
                        </TableCell>

                        {/* Action */}
                        <TableCell className="py-3 text-right pr-6">
                          <Link to={`/employees/${emp.id}`}>
                            <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs font-medium gap-1 rounded-lg">
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
          {!loading && total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <span>Showing</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{start + 1}</span>
                <span>to</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{Math.min(start + itemsPerPage, total)}</span>
                <span>of</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{total}</span>
                <span>employees</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 px-2.5 rounded-lg"
                >
                  <ChevronLeft className="size-3.5 mr-1" />
                  Prev
                </Button>
                <span className="font-semibold px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-8 px-2.5 rounded-lg"
                >
                  Next
                  <ChevronRight className="size-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <MoveDepartmentEmployeesDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        departments={departments}
        fromDepartmentId={id}
        preselectedIds={selected}
        onMoved={load}
      />
    </div>
  );
};

export default DepartmentEmployees;
