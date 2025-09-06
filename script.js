document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded. Script starting.");

    // Check if Amplify exists RIGHT NOW.
    if (window.Amplify) {
        console.log("SUCCESS: Amplify object is present.");
        console.log("Configuring Amplify...");
        window.Amplify.configure({
            Auth: {
                region: "ca-central-1",
                userPoolId: "ca-central-1_a4x0lYeXs",
                userPoolWebClientId: "20kdgtm873doibgad54frneaut"
            }
        });
        console.log("Amplify configured successfully.");
    } else {
        console.error("FAILURE: Amplify object is NOT present.");
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        console.log("Login form found.");
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            try {
                await window.Amplify.Auth.signIn(email, password);
                alert("Login Successful!");
            } catch (error) {
                alert("Login failed: " + error.message);
            }
        });
    } else {
        console.error("Login form not found.");
    }
});

