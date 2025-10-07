import React, { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Check, Pencil, ShieldCheck, Wallet, FileText, Store, Lock, LogOut, Save, X, Loader2 } from 'lucide-react';

/**
 * SellerProfileTab
 * High-polish seller profile with section cards, edit gating by seller password, and action toolbar.
 * Non-functional data actions are stubbed; wire to backend as needed.
 */
const sections = [
	{ id: 'business', label: 'Business Identification', icon: ShieldCheck },
	{ id: 'authorized', label: 'Authorized Contract Person', icon: Check },
	{ id: 'banking', label: 'Banking & Payout Details', icon: Wallet },
	{ id: 'compliance', label: 'Compliance Documents', icon: FileText },
	{ id: 'storefront', label: 'Storefront Setup', icon: Store },
	{ id: 'legal', label: 'Legal & Contract', icon: FileText },
	{ id: 'password', label: 'Change Password', icon: Lock },
];

const SellerProfileTab: React.FC = () => {
	const { uid } = useAuth();
	const [active, setActive] = useState<string>('business');
	const [isEditing, setIsEditing] = useState(false);
	const [passwordGate, setPasswordGate] = useState('');
	const [saving, setSaving] = useState(false);

	const canSave = isEditing && passwordGate.trim().length >= 6;

	const Title = useMemo(() => {
		return (
			<div className="flex items-center justify-between">
	
				<div className="flex items-center gap-2">
					{!isEditing ? (
						<button
							onClick={() => setIsEditing(true)}
							className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50"
						>
							<Pencil className="w-4 h-4" /> Edit
						</button>
					) : (
						<>
							<input
								type="password"
								placeholder="Seller password"
								value={passwordGate}
								onChange={(e) => setPasswordGate(e.target.value)}
								className="text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
							/>
							<button
								onClick={() => setIsEditing(false)}
								className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50"
							>
								<X className="w-4 h-4" /> Cancel
							</button>
							<button
								disabled={!canSave || saving}
								onClick={async () => {
									if (!canSave) return;
									setSaving(true);
									try {
										// TODO: submit form data + password to backend for verification
										await new Promise((r) => setTimeout(r, 800));
										setIsEditing(false);
										setPasswordGate('');
									} finally {
										setSaving(false);
									}
								}}
								className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40"
							>
								{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
							</button>
						</>
					)}
				</div>
			</div>
		);
	}, [isEditing, passwordGate, saving]);

	return (
		<div className="space-y-6">
			{Title}

			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="md:col-span-1 space-y-2">
					{sections.map(({ id, label, icon: Icon }) => (
						<button
							key={id}
							onClick={() => setActive(id)}
							className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition ${
								active === id ? 'bg-teal-50 border-teal-200 text-teal-700' : 'border-gray-200 hover:bg-gray-50'
							}`}
						>
							<Icon className="w-4 h-4" />
							<span className="text-sm font-medium">{label}</span>
						</button>
					))}
					<button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
						<LogOut className="w-4 h-4" />
						<span className="text-sm font-medium">Log out</span>
					</button>
				</div>

				<div className="md:col-span-3">
					<div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
						{active === 'business' && (
							<div className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label className="block text-xs font-medium text-gray-600 mb-1">Clinic Name</label>
										<input
											disabled={!isEditing}
											defaultValue={''}
											className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50"
										/>
									</div>
									<div>
										<label className="block text-xs font-medium text-gray-600 mb-1">Business Registration No.</label>
										<input
											disabled={!isEditing}
											placeholder="e.g. SEC-123456"
											className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50"
										/>
									</div>
								</div>
								<div>
									<label className="block text-xs font-medium text-gray-600 mb-1">Clinic Address</label>
									<input
										disabled={!isEditing}
										placeholder="Street, City, Province"
										className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50"
									/>
								</div>
							</div>
						)}

						{active === 'authorized' && (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-medium text-gray-600 mb-1">Authorized Person</label>
									<input
										disabled={!isEditing}
										placeholder="Full name"
										className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50"
									/>
								</div>
								<div>
									<label className="block text-xs font-medium text-gray-600 mb-1">Contact Number</label>
									<input
										disabled={!isEditing}
										placeholder="+63"
										className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50"
									/>
								</div>
							</div>
						)}

						{active === 'banking' && (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-medium text-gray-600 mb-1">Bank Name</label>
									<input
										disabled={!isEditing}
										placeholder="e.g. BPI"
										className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50"
									/>
								</div>
								<div>
									<label className="block text-xs font-medium text-gray-600 mb-1">Account Number</label>
									<input
										disabled={!isEditing}
										placeholder="XXXX-XXXX-XXXX"
										className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50"
									/>
								</div>
							</div>
						)}

						{active === 'compliance' && (
							<div className="space-y-3">
								<p className="text-xs text-gray-600">Upload business permits and compliance files (PDF/JPG/PNG).</p>
								<input type="file" multiple accept=".pdf,image/*" disabled={!isEditing} />
							</div>
						)}

						{active === 'storefront' && (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-medium text-gray-600 mb-1">Store Name</label>
									<input
										disabled={!isEditing}
										placeholder="Public storefront name"
										className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50"
									/>
								</div>
								<div>
									<label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
									<input
										disabled={!isEditing}
										placeholder="e.g. happy-smiles"
										className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50"
									/>
								</div>
							</div>
						)}

						{active === 'legal' && (
							<div className="space-y-2">
								<label className="block text-xs font-medium text-gray-600 mb-1">Contract Notes</label>
								<textarea
									disabled={!isEditing}
									rows={4}
									className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50"
									placeholder="Any legal notes or references"
								/>
							</div>
						)}

						{active === 'password' && (
							<div className="space-y-3 max-w-md">
								<div>
									<label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
									<input
										type="password"
										disabled={!isEditing}
										className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50"
									/>
								</div>
								<div>
									<label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
									<input
										type="password"
										disabled={!isEditing}
										className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50"
									/>
								</div>
							</div>
						)}

						{/* Right panel actions mimic the spec: View/Edit with password gate */}
						{!isEditing && (
							<div className="flex items-center justify-end gap-2 pt-2">
								<span className="text-xs text-gray-500">Actions:</span>
								<button className="text-xs font-medium text-teal-700 hover:underline">View</button>
								<button onClick={() => setIsEditing(true)} className="text-xs font-medium text-teal-700 hover:underline">
									Edit
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default SellerProfileTab;
