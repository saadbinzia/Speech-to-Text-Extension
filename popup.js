// Handle sign-in page interactions
document.addEventListener('DOMContentLoaded', () => {
  const signupBtn = document.getElementById('signupBtn');
  const signinLink = document.getElementById('signinLink');

  signupBtn.addEventListener('click', () => {
    handleSignup();
  });

  signinLink.addEventListener('click', () => {
    handleSignin();
  });
});

function handleSignup() {
  console.log('Sign up clicked');
  // Open the sidebar with recording interface
  openSidebar();
}

function handleSignin() {
  console.log('Sign in clicked');
  // Open the sidebar with recording interface
  openSidebar();
}

async function openSidebar() {
  try {
    // Get the current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Open the sidebar
    await chrome.sidePanel.open({ tabId: tab.id });
    
    // Close the popup
    window.close();
    
  } catch (error) {
    console.error('Error opening sidebar:', error);
  }
}
