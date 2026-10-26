import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, Search, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { SearchableSelect } from "../ui/SearchableSelect";
import { entityAPI } from "../../services/api";
import { avatarColor } from "../../utils/avatar";

interface MoveEmployeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entities: { id: number; name: string; code?: string }[];
  /** entity to move employees out of (pre-selected) */
  fromEntityId?: number | string | null;
  /** employees already ticked when the dialog opens */
  preselectedIds?: number[];
  onMoved?: () => void;
}

// Move one or many employees from one entity to another.
// Employee ID / biometric ID stay the same; every move is logged in the employee's History.
export const MoveEmployeesDialog: React.FC<MoveEmployeesDialogProps> = ({
  open,
  onOpenChange,
  entities,
  fromEntityId,
  preselectedIds,
  onMoved,
}) => {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // reset every time the dialog opens
  useEffect(() => {
    if (!open) return;
    setFromId(fromEntityId ? String(fromEntityId) : "");
    setToId("");
    setSearch("");
    setSelected(preselectedIds || []);
  }, [open, fromEntityId, preselectedIds]);

  // employees of the "from" entity
  useEffect(() => {
    if (!open || !fromId) {
      setEmployees([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    entityAPI
      .getEntityEmployees(fromId)
      .then((res: any) => {
        if (cancelled) return;
        const list = res?.data?.employees || [];
        setEmployees(list);
        // keep only ticks that belong to this entity
        setSelected((prev) => prev.filter((id) => list.some((e: any) => e.id === id)));
      })
      .catch(() => !cancelled && toast.error("Failed to load employees"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, fromId]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      [`${e.firstName} ${e.lastName || ""}`, e.employeeId, e.biometricId, e.department?.title, e.jobInfo?.designation]
        .some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [employees, search]);

  const allVisibleSelected = visible.length > 0 && visible.every((e) => selected.includes(e.id));
  const toggleAllVisible = () => {
    if (allVisibleSelected) setSelected((prev) => prev.filter((id) => !visible.some((e) => e.id === id)));
    else setSelected((prev) => [...new Set([...prev, ...visible.map((e) => e.id)])]);
  };
  const toggle = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const entityOptions = entities.map((en) => ({ value: String(en.id), label: en.code ? `${en.name} (${en.code})` : en.name }));
  const fromName = entities.find((en) => String(en.id) === fromId)?.name;
  const toName = entities.find((en) => String(en.id) === toId)?.name;

  const handleMove = async () => {
    if (!fromId || !toId || !selected.length) return;
    setSaving(true);
    try {
      const res = await entityAPI.moveEmployees({ employeeIds: selected, toEntityId: Number(toId) });

      let actorName = 'HR Admin';
      try {
        const userRaw = localStorage.getItem('user');
        if (userRaw) {
          const u = JSON.parse(userRaw);
          if (u?.name) actorName = u.name;
          else if (u?.firstName) actorName = `${u.firstName} ${u.lastName || ''}`.trim();
        }
      } catch (e) {}

      // Save audit log to each moved employee's history in real-time
      selected.forEach((empId) => {
        try {
          const key = `frontpin_audit_logs_${empId}`;
          const raw = localStorage.getItem(key);
          const logs = raw ? JSON.parse(raw) : [];
          const logEntry = {
            id: `move_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            type: 'ENTITY_TRANSFER',
            category: 'Transfers',
            title: `Entity Transfer: ${fromName || 'Previous Entity'} → ${toName || 'New Entity'}`,
            fromValue: fromName || 'Previous Entity',
            toValue: toName || 'New Entity',
            description: `Employee moved to business entity "${toName || 'New Entity'}" from "${fromName || 'Previous Entity'}".`,
            date: new Date().toISOString(),
            actor: actorName,
          };
          logs.unshift(logEntry);
          localStorage.setItem(key, JSON.stringify(logs));
        } catch (e) {
          console.error("Failed to log entity move for emp", empId, e);
        }
      });
      window.dispatchEvent(new CustomEvent('employee-updated', { detail: { movedIds: selected, toEntityId: toId } }));

      toast.success(res?.message || "Employees moved");
      onOpenChange(false);
      onMoved?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to move employees");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 text-left">
          <div className="flex items-start gap-3 pr-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Shuffle className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Move employees to another entity</DialogTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Employee ID and biometric ID stay the same. Each move is saved in the employee's History.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">From entity</Label>
              <SearchableSelect
                className="w-full h-10 rounded-lg"
                placeholder="Select entity"
                searchPlaceholder="Search entity..."
                value={fromId}
                onValueChange={(v) => {
                  setFromId(v);
                  setSelected([]);
                  if (v === toId) setToId("");
                }}
                options={entityOptions}
              />
            </div>
            <ArrowRight className="hidden sm:block size-4 text-gray-400 mb-3" />
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">To entity</Label>
              <SearchableSelect
                className="w-full h-10 rounded-lg"
                placeholder="Select entity"
                searchPlaceholder="Search entity..."
                value={toId}
                onValueChange={setToId}
                options={entityOptions.filter((o) => o.value !== fromId)}
              />
            </div>
          </div>

          {fromId && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, ID, department..."
                    className="pl-8 h-8 text-xs bg-white dark:bg-gray-950"
                  />
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-500 tabular-nums">
                    {selected.length} of {employees.length} selected
                  </span>
                  <button type="button" onClick={toggleAllVisible} className="font-semibold text-blue-600 hover:underline" disabled={!visible.length}>
                    {allVisibleSelected ? "Deselect all" : "Select all"}
                  </button>
                </div>
              </div>

              <div className="max-h-[320px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <div className="py-10 text-center text-sm text-gray-500">
                    <Loader2 className="size-4 animate-spin inline mr-2" /> Loading employees…
                  </div>
                ) : visible.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-500">
                    {employees.length ? "No employee matches the search." : "This entity has no active employees."}
                  </div>
                ) : (
                  visible.map((e) => {
                    const name = `${e.firstName || ""} ${e.lastName || ""}`.trim();
                    return (
                      <label key={e.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-blue-50/40 dark:hover:bg-gray-900/40">
                        <Checkbox checked={selected.includes(e.id)} onCheckedChange={() => toggle(e.id)} />
                        <div className={`size-8 rounded-full font-semibold text-[11px] flex items-center justify-center shrink-0 ${avatarColor(name)}`}>
                          {`${e.firstName?.[0] || ""}${e.lastName?.[0] || ""}`.toUpperCase() || "E"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{name}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                            {[e.employeeId, e.department?.title, e.jobInfo?.designation].filter(Boolean).join(" · ") || "—"}
                          </p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 gap-2 sm:justify-between sm:items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {selected.length && toName ? `${selected.length} employee${selected.length === 1 ? "" : "s"}: ${fromName} → ${toName}` : ""}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" className="h-10 rounded-lg" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5"
              disabled={!fromId || !toId || !selected.length || saving}
              onClick={handleMove}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Shuffle className="size-4" />}
              Move {selected.length || ""}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
