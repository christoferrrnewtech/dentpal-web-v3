import React, { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Pencil, Save, X, Loader2, Upload, Paperclip, CheckCircle2, AlertCircle } from 'lucide-react';
import Tesseract from 'tesseract.js';

/**
 * SellerProfileTab
 * Streamlined seller profile tab focused on Vendor Enrollment.
 */
const SellerProfileTab: React.FC = () => {
	const { uid } = useAuth();
	const [isEditing, setIsEditing] = useState(false);
	const [saving, setSaving] = useState(false);

	// Only keep Vendor Enrollment state
	// Use the same category set as Inventory/Add Product
	const CATEGORY_OPTIONS = ['Consumables', 'Dental Equipment', 'Disposables', 'Equipment'];
	const [vendor, setVendor] = useState({
		categories: [] as string[],
		companyName: '',
		address: { street: '', barangay: '', municipality: '', province: '', zip: '' }, // split address
		contactPerson: '',
		landline: '',
		mobile: '',
		email: '',
		website: '',
		tin: '',
		bankingInfo: '',
		bankBranchAddress: '',
		merchantAgreement: null as File | null,
		requirements: {
			secOrDti: null as File | null,
			bir2303: null as File | null,
			fdaLto: null as File | null,
			catalogue: null as File | null,
			warrantyPolicy: null as File | null,
		},
	});
	const [submitLoading, setSubmitLoading] = useState(false);
	// Validation state
	const [errors, setErrors] = useState<{ mobile: string; email: string; tin: string; tinOcr: string }>({ mobile: '', email: '', tin: '', tinOcr: '' });
	const [mapOpen, setMapOpen] = useState(false);

	// TIN helpers
	const normalizeTin = (v: string) => v.replace(/\D/g, '').slice(0, 12);
	const formatTin = (digits: string) => {
		const d = digits.replace(/\D/g, '');
		if (d.length <= 3) return d;
		if (d.length <= 6) return `${d.slice(0,3)}-${d.slice(3)}`;
		if (d.length <= 9) return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;
		return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6,9)}-${d.slice(9,12)}`;
	};
	const validateTin = (digits: string) => (/^\d{9}(\d{3})?$/.test(digits) ? '' : 'Enter 9 digits or 12 digits (with branch code).');

	// Mobile/Email helpers
	const validateMobile = (val: string) => (/^09\d{9}$/.test(val) ? '' : 'Must start with 09 and be 11 digits.');
	const validateEmail = (val: string) => (val.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? '' : 'Invalid email address.');
	const formatMobile = (digits: string) => {
		const d = digits.slice(0, 11);
		if (!d) return '';
		if (d.length <= 4) return d;
		if (d.length <= 7) return `${d.slice(0,4)} ${d.slice(4)}`;
		return `${d.slice(0,4)} ${d.slice(4,7)} ${d.slice(7)}`;
	};

	const onMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
		setField('mobile', digits);
		setErrors((prev) => ({ ...prev, mobile: digits ? validateMobile(digits) : '' }));
	};
	const onEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const v = e.target.value;
		setField('email', v);
		setErrors((prev) => ({ ...prev, email: v ? validateEmail(v) : '' }));
	};

	// TIN masked input change
	const onTinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const digits = normalizeTin(e.target.value);
		setField('tin', digits);
		setErrors((prev) => ({ ...prev, tin: digits ? validateTin(digits) : '' }));
	};

	// OCR compare when 2303 is uploaded
	const [ocrLoading, setOcrLoading] = useState(false);
	const runTinOcrCheck = async (file: File) => {
		setOcrLoading(true);
		try {
			const { data } = await Tesseract.recognize(file, 'eng', { logger: () => {} });
			const text = (data.text || '').replace(/\s+/g, ' ').toUpperCase();
			// Extract TIN-like patterns
			const matches = text.match(/\b\d{3}[-\s]?\d{3}[-\s]?\d{3}(?:[-\s]?\d{3})?\b/g) || [];
			const normalized = matches.map(m => m.replace(/\D/g, ''));
			const unique = Array.from(new Set(normalized));
			const inputTin = vendor.tin; // digits only stored
			const ok = unique.some(t => t === inputTin || (t.length === 12 && inputTin.length === 9 && t.startsWith(inputTin)));
			setErrors(prev => ({ ...prev, tinOcr: ok ? '' : unique.length ? 'TIN in 2303 does not match the entered TIN.' : 'Could not detect a TIN in the uploaded 2303.' }));
		} catch (e) {
			setErrors(prev => ({ ...prev, tinOcr: 'OCR failed. Please ensure the document is clear.' }));
		} finally {
			setOcrLoading(false);
		}
	};

	// Address helpers
	const setAddressField = (k: keyof typeof vendor.address, val: string) => setVendor(v => ({ ...v, address: { ...v.address, [k]: val } }));
	const onZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const digits = e.target.value.replace(/\D/g, '').slice(0, 4); // PH ZIP is 4 digits
		setAddressField('zip', digits);
	};
	const fullAddress = useMemo(() => {
		const { street, barangay, municipality, province, zip } = vendor.address;
		return [street, barangay, municipality, province, zip ? `\u200E${zip}` : '']
			.filter(Boolean)
			.join(', ');
	}, [vendor.address]);

	const hasErrors = !!(errors.mobile || errors.email || errors.tin || errors.tinOcr);
	const addressReady = !!(vendor.address.street && vendor.address.municipality && vendor.address.province);

	const Title = useMemo(() => (
		<div className="flex items-center justify-between">
			<h2 className="text-base font-semibold text-gray-900">Vendor Enrollment</h2>
			<div className="flex items-center gap-2">
				{!isEditing ? (
					<button onClick={() => setIsEditing(true)} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50">
						<Pencil className="w-4 h-4" /> Edit
					</button>
				) : (
					<>
						<button onClick={() => setIsEditing(false)} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50">
							<X className="w-4 h-4" /> Cancel
						</button>
						<button
							disabled={saving}
							onClick={async () => {
								setSaving(true);
								try {
									// TODO: save draft to backend
									await new Promise(r => setTimeout(r, 800));
									setIsEditing(false);
								} finally { setSaving(false); }
							}}
							className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40"
						>
							{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
						</button>
					</>
				)}
			</div>
		</div>
	), [isEditing, saving]);

	// Helpers
	const toggleCategory = (cat: string) => {
		setVendor(v => ({ ...v, categories: v.categories.includes(cat) ? v.categories.filter(c => c !== cat) : [...v.categories, cat] }));
	};
	const setField = (k: keyof typeof vendor, val: any) => setVendor(v => ({ ...v, [k]: val }));
	const setReqFile = (k: keyof typeof vendor.requirements, file: File | null) => {
		setVendor(v => ({ ...v, requirements: { ...v.requirements, [k]: file } }));
		if (k === 'bir2303' && file) {
			// Run OCR check in background
			runTinOcrCheck(file);
		}
	};

	const formattedMobile = useMemo(() => formatMobile(vendor.mobile), [vendor.mobile]);
	const formattedTin = useMemo(() => formatTin(vendor.tin), [vendor.tin]);

	return (
		<div className="space-y-6">
			{Title}

			{/* Single card with ONLY the requested fields */}
			<div className="bg-white rounded-lg border border-gray-200 p-4 space-y-5">
				{/* Categories (checkboxes) */}
				<div>
					<div className="text-xs font-medium text-gray-600 mb-1">Product Category</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
						{CATEGORY_OPTIONS.map(cat => (
							<label key={cat} className={`flex items-center gap-2 p-2 rounded-lg border ${vendor.categories.includes(cat) ? 'border-teal-300 bg-teal-50' : 'border-gray-200'}`}>
								<input
									type="checkbox"
									disabled={!isEditing}
									checked={vendor.categories.includes(cat)}
									onChange={() => toggleCategory(cat)}
									className="h-4 w-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500 disabled:opacity-50"
								/>
								<span className="text-sm text-gray-800">{cat}</span>
							</label>
						))}
					</div>
				</div>

				{/* Company Info */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-xs font-medium text-gray-600 mb-1">Company Name</label>
						<input disabled={!isEditing} value={vendor.companyName} onChange={(e)=> setField('companyName', e.target.value)} className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50" />
					</div>
					<div>
						<label className="block text-xs font-medium text-gray-600 mb-1">Customer Service Contact Person</label>
						<input disabled={!isEditing} value={vendor.contactPerson} onChange={(e)=> setField('contactPerson', e.target.value)} className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50" />
					</div>
					<div className="md:col-span-2">
						<label className="block text-xs font-medium text-gray-600 mb-1">Street</label>
						<input disabled={!isEditing} value={vendor.address.street} onChange={(e)=> setAddressField('street', e.target.value)} className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50" />
					</div>
					<div>
						<label className="block text-xs font-medium text-gray-600 mb-1">Barangay</label>
						<input disabled={!isEditing} value={vendor.address.barangay} onChange={(e)=> setAddressField('barangay', e.target.value)} className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50" />
					</div>
					<div>
						<label className="block text-xs font-medium text-gray-600 mb-1">Municipality / City</label>
						<input disabled={!isEditing} value={vendor.address.municipality} onChange={(e)=> setAddressField('municipality', e.target.value)} className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50" />
					</div>
					<div>
						<label className="block text-xs font-medium text-gray-600 mb-1">Province</label>
						<input disabled={!isEditing} value={vendor.address.province} onChange={(e)=> setAddressField('province', e.target.value)} className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50" />
					</div>
					<div>
						<label className="block text-xs font-medium text-gray-600 mb-1">ZIP Code</label>
						<input disabled={!isEditing} value={vendor.address.zip} onChange={onZipChange} inputMode="numeric" maxLength={4} placeholder="e.g. 1000" className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50" />
					</div>
					<div className="md:col-span-2 flex items-center gap-2">
						<button
							type="button"
							disabled={!isEditing || !addressReady}
							onClick={() => setMapOpen(true)}
							className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
						>
							Verify on map
						</button>
						{addressReady ? (
							<a
								className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50"
								href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
								target="_blank"
								rel="noreferrer"
							>
								View in Google Maps
							</a>
						) : (
							<button
								type="button"
								disabled
								className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40"
							>
								View in Google Maps
							</button>
						)}
						<span className="text-xs text-gray-500">We will open a map with the entered address for quick verification.</span>
					</div>

					{/* Continue with Landline/Mobile/Email/Website/TIN */}
					<div>
						<label className="block text-xs font-medium text-gray-600 mb-1">Landline No</label>
						<input disabled={!isEditing} value={vendor.landline} onChange={(e)=> setField('landline', e.target.value)} className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50" />
					</div>
					<div>
						<label className="block text-xs font-medium text-gray-600 mb-1">Mobile No</label>
						<input
							disabled={!isEditing}
							value={formattedMobile}
							onChange={onMobileChange}
							inputMode="numeric"
							maxLength={13}
							placeholder="0912 345 6789"
							aria-invalid={!!errors.mobile}
							className={`w-full text-sm p-2 border rounded-lg disabled:bg-gray-50 ${errors.mobile ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200'}`}
						/>
						{errors.mobile && <p className="mt-1 text-xs text-red-600">{errors.mobile}</p>}
					</div>
					<div>
						<label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
						<input
							disabled={!isEditing}
							type="email"
							value={vendor.email}
							onChange={onEmailChange}
							placeholder="name@example.com"
							aria-invalid={!!errors.email}
							className={`w-full text-sm p-2 border rounded-lg disabled:bg-gray-50 ${errors.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200'}`}
						/>
						{errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
					</div>
					<div>
						<label className="block text-xs font-medium text-gray-600 mb-1">Website</label>
						<input disabled={!isEditing} value={vendor.website} onChange={(e)=> setField('website', e.target.value)} placeholder="https://" className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50" />
					</div>
					<div>
						<label className="block text-xs font-medium text-gray-600 mb-1">TIN No</label>
						<input
							disabled={!isEditing}
							value={formattedTin}
							onChange={onTinChange}
							inputMode="numeric"
							maxLength={15}
							placeholder="000-000-000 or 000-000-000-000"
							aria-invalid={!!errors.tin || !!errors.tinOcr}
							className={`w-full text-sm p-2 border rounded-lg disabled:bg-gray-50 ${errors.tin || errors.tinOcr ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200'}`}
						/>
						{errors.tin && <p className="mt-1 text-xs text-red-600">{errors.tin}</p>}
						{ocrLoading && <p className="mt-1 text-xs text-gray-500">Checking TIN against 2303…</p>}
						{errors.tinOcr && !ocrLoading && <p className="mt-1 text-xs text-red-600">{errors.tinOcr}</p>}
					</div>
				</div>

				{/* Banking */}
				<div className="grid grid-cols-1 gap-4">
					<div>
						<label className="block text-xs font-medium text-gray-600 mb-1">Payment / Banking Information</label>
						<textarea disabled={!isEditing} rows={3} value={vendor.bankingInfo} onChange={(e)=> setField('bankingInfo', e.target.value)} className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50" placeholder="Bank name, account name/number" />
					</div>
					<div>
						<label className="block text-xs font-medium text-gray-600 mb-1">Bank Branch Address</label>
						<input disabled={!isEditing} value={vendor.bankBranchAddress} onChange={(e)=> setField('bankBranchAddress', e.target.value)} className="w-full text-sm p-2 border border-gray-200 rounded-lg disabled:bg-gray-50" />
					</div>
				</div>

				{/* Merchant Agreement / Contract */}
				<div>
					<label className="block text-xs font-medium text-gray-600 mb-1">Merchant Agreement / Contract (PDF)</label>
					<div className="flex items-center gap-3">
						<input disabled={!isEditing} type="file" accept="application/pdf" onChange={(e)=> setField('merchantAgreement', e.target.files?.[0] || null)} />
						{vendor.merchantAgreement ? (
							<span className="text-xs text-gray-700 inline-flex items-center gap-1"><Paperclip className="w-3 h-3" /> {vendor.merchantAgreement.name}</span>
						) : (
							<span className="text-xs text-gray-500">No file selected</span>
						)}
					</div>
				</div>

				{/* Requirements */}
				<div>
					<div className="text-xs font-medium text-gray-600 mb-2">Requirements</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						{[
							{ key: 'secOrDti', label: 'SEC Certificate or DTI Registration' },
							{ key: 'bir2303', label: 'BIR Certificate of Registration (Form 2303)' },
							{ key: 'fdaLto', label: 'FDA LTO Medical Device' },
							{ key: 'catalogue', label: 'Catalogue / Product Lists' },
							{ key: 'warrantyPolicy', label: 'Warranty / After Sales Policy' },
						].map(({ key, label }) => (
							<div key={key} className="p-3 border border-gray-200 rounded-lg">
								<div className="text-xs text-gray-700 mb-2">{label}</div>
								<div className="flex items-center justify-between gap-2">
									<input disabled={!isEditing} type="file" accept="application/pdf,image/*" onChange={(e)=> setReqFile(key as any, e.target.files?.[0] || null)} />
									<div className="text-[11px] text-gray-600 inline-flex items-center gap-1">
										{(vendor.requirements as any)[key] ? <><CheckCircle2 className="w-3 h-3 text-teal-600" /> Uploaded</> : <><AlertCircle className="w-3 h-3 text-amber-600" /> Required</>}
									</div>
								</div>
								{key === 'bir2303' && errors.tinOcr && !ocrLoading && (
									<p className="mt-2 text-xs text-red-600">{errors.tinOcr}</p>
								)}
								{key === 'bir2303' && ocrLoading && (
									<p className="mt-2 text-xs text-gray-500">Checking document…</p>
								)}
							</div>
						))}
					</div>
				</div>

				{/* Submit */}
				<div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
					<button
						disabled={!isEditing || submitLoading || hasErrors}
						onClick={async () => {
							setSubmitLoading(true);
							try {
								// TODO: send vendor enrollment to backend/storage
								await new Promise(r => setTimeout(r, 1000));
								alert('Vendor Enrollment submitted');
							} finally { setSubmitLoading(false); }
						}}
						className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40"
					>
						{submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Submit Enrollment
					</button>
				</div>
			</div>

			{mapOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<div className="absolute inset-0 bg-black/40" onClick={() => setMapOpen(false)} />
					<div className="relative z-10 w-[95vw] max-w-3xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
						<div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
							<div>
								<div className="text-xs text-gray-500">Verify Address</div>
								<div className="text-sm font-medium text-gray-900 truncate">{fullAddress || '—'}</div>
							</div>
							<button className="text-xs px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50" onClick={() => setMapOpen(false)}>Close</button>
						</div>
						<div className="aspect-video w-full">
							<iframe
								title="Map"
								width="100%"
								height="100%"
								style={{ border: 0 }}
								loading="lazy"
								allowFullScreen
								src={`https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`}
							/>
						</div>
						<div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
							<a
								className="text-xs text-teal-700 hover:underline"
								href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
								target="_blank"
								rel="noreferrer"
							>
								Open in Google Maps
							</a>
							<button className="text-xs px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50" onClick={() => setMapOpen(false)}>Done</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default SellerProfileTab;
