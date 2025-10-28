import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export type filters = { search: string; location: string; specialty: string; status: string };
export default function UserFilters ({ filters, locations, specialties, onChange }: { filters: filters; locations: string[]; specialties: string[]; onChange: (f: filters)=>void}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
                <Label> Search </Label>
                <Input value = {filters.search} onChange ={e => onChange ({...filters, search: e.target.value })} />
            </div>
            <div>
                <Label> Location</Label>
                <Select value = {filters.location} onValueChange = {v => onChange ({...filters, location: v})}>
                    <SelectTrigger> <SelectValue/> </SelectTrigger>
                    <SelectContent>
                        <SelectItem value ="all"> All</SelectItem>
                        {specialties.map (s => <SelectItem key= {s} value={s} > {s} </SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label> Specialty</Label>
                <Select value = {filters.specialty} onValueChange= {v => onChange ({...filters, specialty: v})}>
                    <SelectTrigger> <SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all"> All </SelectItem>
                        {specialties.map (s => <SelectItem key= {s} value={s} > {s} </SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label> Status </Label>
                <Select value = {filters.status} onValueChange = {v => onChange ({...filters, status: v})}>
                    <SelectTrigger> <SelectValue/> </SelectTrigger>
                    <SelectContent> 
                        <SelectItem value ="all"> All</SelectItem>
                        <SelectItem value ="active"> Active </SelectItem>
                        <SelectItem value ="inactive"> Inactive</SelectItem>
                        <SelectItem value ="pending"> Pending </SelectItem>
                        <SelectItem value = "suspended"> Suspended </SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
