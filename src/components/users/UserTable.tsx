import React from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { User } from "./types";
import { StatusBadge } from "./badges";
import { Pencil, Eye, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function approvalClass(status: User['sellerApprovalStatus']) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-white text-foreground border';
  }
}

export default function UserTable({
  users,
  selected,
  onSelect,
  onSelectAll,
  onView,
  onEdit,
  onDelete,
  onChangeSellerApproval,
}: {
  users: User[];
  selected: string[];
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onView: (u: User) => void;
  onEdit: (u: User) => void;
  onDelete: (id: string) => void;
  onChangeSellerApproval: (id: string, status: User["sellerApprovalStatus"]) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table className="">
        <TableHeader>
          <TableRow>
            <TableHead>
              <Checkbox
                checked={selected.length === users.length && users.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>For Seller Approval</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Reward Points</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id} className="hover:bg-muted/40">
              <TableCell>
                <Checkbox
                  checked={selected.includes(u.id)}
                  onCheckedChange={(c) => onSelect(u.id, !!c)}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={(u as any).photoURL} alt={`${u.firstName} ${u.lastName}`} />
                    <AvatarFallback>{(u.firstName?.[0] ?? 'U')}{(u.lastName?.[0] ?? '')}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium leading-tight">{u.firstName} {u.lastName}</span>
                    <span className="text-xs text-muted-foreground leading-tight">{u.email}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Select
                  value={u.sellerApprovalStatus}
                  onValueChange={(v) => onChangeSellerApproval(u.id, v as User["sellerApprovalStatus"])}
                >
                  <SelectTrigger className={`h-8 w-[180px] ${approvalClass(u.sellerApprovalStatus)} justify-between` }>
                    <SelectValue placeholder="Set status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_requested">Not requested</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Not approved</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <StatusBadge status={u.status} />
              </TableCell>
              <TableCell className="text-right">{u.rewardPoints ?? 0}</TableCell>
              <TableCell className="text-right">
                <TooltipProvider>
                  <div className="flex justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => onEdit(u)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" aria-label="View" onClick={() => onView(u)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => onDelete(u.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}