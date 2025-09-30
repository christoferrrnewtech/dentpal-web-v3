// Add this temporary code to the bottom of your LoginFormView.tsx file
// You can use the browser console to run these functions

// Add these buttons temporarily to your login form
<div className="mt-6 border-t pt-4 border-gray-200">
  <p className="text-xs text-gray-500 mb-2 text-center">Account Recovery Options</p>
  <div className="grid grid-cols-1 gap-2">
    <button
      type="button"
      onClick={() => {
        const email = prompt("Enter email to reset password:", "tofer.rrnewtech@gmail.com");
        if (email) {
          import('firebase/auth').then(({ sendPasswordResetEmail }) => {
            sendPasswordResetEmail(auth, email)
              .then(() => {
                alert(`Password reset email sent to ${email}`);
              })
              .catch((error) => {
                alert(`Error: ${error.message}`);
                console.error(error);
              });
          });
        }
      }}
      className="text-xs bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded"
    >
      Reset Password
    </button>
    <button
      type="button"
      onClick={() => {
        const defaultAdmin = {
          email: 'admin@gmail.com',
          password: 'admin123',
        };
        onEmail(defaultAdmin.email);
        onPassword(defaultAdmin.password);
        alert(`Default admin credentials filled in: ${defaultAdmin.email}`);
      }}
      className="text-xs bg-purple-500 hover:bg-purple-600 text-white py-2 px-3 rounded"
    >
      Use Default Admin
    </button>
  </div>
</div>
