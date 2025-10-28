import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import React from 'react';

export const StatusBadge = ({ status }: {status: string}) => {
    if (status === 'active') return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>;
    if (status === 'inactive') return <Badge className="bg-gray-100 text-gray-800"><Clock className="w-3 h-3 mr-1"/> Inactive </Badge>;
    if (status === 'pending') return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1"/> Pending </Badge>;
    if (status === 'suspended') return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1"/> Suspended </Badge>;
    return <Badge>Unknown</Badge>;
};

