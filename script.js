// ===== Data =====
const skillsData = [
  { name: "HTML",       level: 90, icon: "fab fa-html5"        },
  { name: "CSS",        level: 85, icon: "fab fa-css3-alt"     },
  { name: "JavaScript", level: 75, icon: "fab fa-js"           },
  { name: "Networking", level: 70, icon: "fas fa-network-wired"},
  { name: "Linux",      level: 65, icon: "fab fa-linux"        },
  { name: "Database",   level: 60, icon: "fas fa-database"     },
];

const projectsData = [
  {
    name: "Web Portfolio",
    description: "Website portofolio pribadi yang responsif dan modern menggunakan HTML, CSS, dan JavaScript murni.",
    technologies: ["HTML", "CSS", "JavaScript"],
    image: "assets/project1.jpg",
    demoUrl: "#",
    githubUrl: "https://github.com/ahmadiqbal",
  },
  {
    name: "Network Monitor Dashboard",
    description: "Dashboard monitoring jaringan sederhana untuk memantau status perangkat jaringan secara real-time.",
    technologies: ["HTML", "CSS", "JavaScript", "Networking"],
    image: "assets/project2.jpg",
    demoUrl: "#",
    githubUrl: "https://github.com/ahmadiqbal",
  },
  {
    name: "Student Database App",
    description: "Aplikasi manajemen data mahasiswa dengan fitur CRUD menggunakan PHP dan MySQL.",
    technologies: ["PHP", "MySQL", "HTML", "CSS"],
    image: "assets/project3.jpg",
    demoUrl: "#",
    githubUrl: "https://github.com/ahmadiqbal",
  },
];

// ===== Render Skills =====
function renderSkills(container, data) {
  if (!container) return;
  container.innerHTML = data.map(skill => `
    <div class="skill-card animate-on-scroll">
      <div class="skill-header">
        <span class="skill-name">${skill.name}</span>
        <i class="${skill.icon} skill-icon" aria-hidden="true"></i>
      </div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" data-target="${skill.level}" style="width: 0%"></div>
      </div>
      <span class="skill-level">${skill.level}%</span>
    </div>
  `).join('');
}

// ===== Render Projects =====
function renderProjects(container, data) {
  if (!container) return;
  container.innerHTML = data.map(project => `
    <div class="project-card animate-on-scroll">
      <img
        src="${project.image}"
        alt="${project.name}"
        class="project-img"
        onerror="this.src='https://via.placeholder.com/400x200/2563eb/ffffff?text=${encodeURIComponent(project.name)}'"
      />
      <div class="project-info">
        <h3 class="project-name">${project.name}</h3>
        <p class="project-desc">${project.description}</p>
        <div class="project-tech">
          ${project.technologies.map(t => `<span class="tech-tag">${t}</span>`).join('')}
        </div>
        <div class="project-links">
          <a href="${project.demoUrl}" class="btn btn-primary btn-sm" target="_blank" rel="noopener">Demo</a>
          <a href="${project.githubUrl}" class="btn btn-outline btn-sm" target="_blank" rel="noopener">
            <i class="fab fa-github" aria-hidden="true"></i> GitHub
          </a>
        </div>
      </div>
    </div>
  `).join('');
}

// ===== Dark Mode =====
function initDarkMode() {
  try {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'enabled') {
      document.documentElement.setAttribute('data-theme', 'dark');
      const btn = document.getElementById('dark-mode-toggle');
      if (btn) btn.innerHTML = '<i class="fas fa-sun"></i>';
    }
  } catch (e) {
    // localStorage not available (e.g. private browsing) — fallback to light theme
  }
}

function toggleDarkMode() {
  const html = document.documentElement;
  const btn = document.getElementById('dark-mode-toggle');
  if (html.getAttribute('data-theme') === 'dark') {
    html.removeAttribute('data-theme');
    if (btn) btn.innerHTML = '<i class="fas fa-moon"></i>';
    try { localStorage.setItem('darkMode', 'disabled'); } catch (e) {}
  } else {
    html.setAttribute('data-theme', 'dark');
    if (btn) btn.innerHTML = '<i class="fas fa-sun"></i>';
    try { localStorage.setItem('darkMode', 'enabled'); } catch (e) {}
  }
}

// ===== Skill Bar Animation =====
function animateSkillBars() {
  document.querySelectorAll('.progress-bar-fill').forEach(bar => {
    const target = parseInt(bar.dataset.target, 10);
    if (!isNaN(target)) {
      bar.style.width = target + '%';
    }
  });
}

// ===== Active Nav Link =====
function setActiveNavLink(sectionId) {
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === '#' + sectionId) {
      link.classList.add('active');
    }
  });
}

// ===== Form Validation =====
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateForm(name, email, message) {
  const errors = {};
  if (!name || name.trim() === '') {
    errors.name = 'Nama tidak boleh kosong.';
  }
  if (!email || email.trim() === '') {
    errors.email = 'Email tidak boleh kosong.';
  } else if (!isValidEmail(email)) {
    errors.email = 'Format email tidak valid.';
  }
  if (!message || message.trim() === '') {
    errors.message = 'Pesan tidak boleh kosong.';
  }
  return errors;
}

// ===== DOMContentLoaded Init =====
document.addEventListener('DOMContentLoaded', () => {
  // Init dark mode from localStorage
  initDarkMode();

  // Render dynamic content
  renderSkills(document.getElementById('skills-container'), skillsData);
  renderProjects(document.getElementById('projects-container'), projectsData);

  // Dark mode toggle
  const darkToggle = document.getElementById('dark-mode-toggle');
  if (darkToggle) darkToggle.addEventListener('click', toggleDarkMode);

  // Hamburger menu
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });
    // Close menu when a nav link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // IntersectionObserver fallback
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.animate-on-scroll').forEach(el => el.classList.add('visible'));
    animateSkillBars();
    return;
  }

  // Scroll animation observer
  const scrollObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        scrollObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.animate-on-scroll').forEach(el => scrollObserver.observe(el));

  // Skill bar animation observer
  const skillsSection = document.getElementById('skills');
  if (skillsSection) {
    const skillObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateSkillBars();
          skillObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    skillObserver.observe(skillsSection);
  }

  // Active nav link observer
  const sections = document.querySelectorAll('section[id]');
  const navObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setActiveNavLink(entry.target.id);
      }
    });
  }, { threshold: 0.4 });
  sections.forEach(section => navObserver.observe(section));

  // Contact form validation
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const nameVal    = document.getElementById('name').value;
      const emailVal   = document.getElementById('email').value;
      const messageVal = document.getElementById('message').value;

      const errors = validateForm(nameVal, emailVal, messageVal);

      // Clear previous errors
      ['name', 'email', 'message'].forEach(field => {
        const errEl = document.getElementById(field + '-error');
        if (errEl) errEl.textContent = '';
      });

      if (Object.keys(errors).length > 0) {
        Object.entries(errors).forEach(([field, msg]) => {
          const errEl = document.getElementById(field + '-error');
          if (errEl) errEl.textContent = msg;
        });
        return;
      }

      // Show success
      const successEl = document.getElementById('form-success');
      if (successEl) successEl.classList.remove('hidden');
      form.reset();
      setTimeout(() => {
        if (successEl) successEl.classList.add('hidden');
      }, 5000);
    });

    // Clear error on input
    ['name', 'email', 'message'].forEach(field => {
      const input = document.getElementById(field);
      if (input) {
        input.addEventListener('input', () => {
          const errEl = document.getElementById(field + '-error');
          if (errEl) errEl.textContent = '';
        });
      }
    });
  }
});

// ===== Export for testing (Node/jsdom environment) =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    skillsData,
    projectsData,
    renderSkills,
    renderProjects,
    initDarkMode,
    toggleDarkMode,
    animateSkillBars,
    setActiveNavLink,
    isValidEmail,
    validateForm,
  };
}
