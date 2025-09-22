// Initialize AOS
AOS.init({
    duration: 1000,
    once: true,
    offset: 100
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Hide/show navbar on scroll
let lastScrollTop = 0;
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollTop > lastScrollTop && scrollTop > 100) {
        // Scrolling down - hide navbar
        navbar.style.transform = 'translateY(-100%)';
        navbar.style.transition = 'transform 0.3s ease-in-out';
    } else {
        // Scrolling up - show navbar
        navbar.style.transform = 'translateY(0)';
        navbar.style.transition = 'transform 0.3s ease-in-out';
    }

    lastScrollTop = scrollTop;
});

// Animated counters
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number[data-count]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.getAttribute('data-count'));
                const duration = 2000;
                const start = 0;
                const increment = target / (duration / 16);
                let current = start;

                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        counter.textContent = target.toLocaleString() + (target === 2000 ? '+' : '');
                        clearInterval(timer);
                    } else {
                        counter.textContent = Math.floor(current).toLocaleString() + (target === 2000 ? '+' : '');
                    }
                }, 16);

                observer.unobserve(counter);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}

// Use of Funds Pie Chart
function createFundsChart() {
    const ctx = document.getElementById('fundsChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Sales & Marketing', 'Product Development', 'Operations', 'Legal & Compliance'],
            datasets: [{
                data: [15, 65, 15, 5],
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0'
                ],
                borderWidth: 3,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                duration: 2000
            }
        }
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    animateCounters();
    createFundsChart();
});