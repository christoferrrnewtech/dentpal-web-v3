import React from "react";

const PoliciesTab: React.FC = () => {
  return (
    <div className="p-6 bg-white rounded-xl border">
      <h2 className="text-xl font-bold mb-4">Terms & Policies</h2>
      <p>
        This section will allow admins to manage the platform's Terms and
        Conditions, Privacy Policy, and other legal documents.
      </p>
      <div className="mt-6 text-gray-500 italic">
        (Coming soon: Add, edit, and publish your platform policies here.)
      </div>
    </div>
  );
};

export default PoliciesTab;
