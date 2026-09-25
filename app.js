const apiKey = "c6f7002ec2704572886a4ad382eb2c9c";
const favoritesKey = "weatherFavorites";
const darkModeKey = "weatherDarkMode";
const unitKey = "weatherUnit";

// Simpan data terakhir agar bisa di-render ulang saat ganti °C / °F
let lastCurrent = null;
let lastForecast = null;
let useFahrenheit = false;

$(document).ready(function () {
  // Load favorites on start
  loadFavorites();

  // Load preferensi dark mode & satuan suhu
  applyDarkMode(localStorage.getItem(darkModeKey) === "true");
  useFahrenheit = localStorage.getItem(unitKey) === "F";
  $("#unitToggle").prop("checked", useFahrenheit);
  updateUnitLabel();

  // Search
  $("#searchForm").on("submit", function (e) {
    e.preventDefault();

    const city = $("#cityInput").val().trim();

    // Soal 1a: nama kota kosong
    if (!city) {
      showError("Nama kota tidak boleh kosong. Silakan masukkan nama kota.");
      return;
    }

    fetchWeather(city);
  });

  // Klik nama kota di favorit -> tampilkan cuaca
  $("#favorites").on("click", ".fav-item", function () {
    const city = $(this).data("city");
    fetchWeather(city);
  });

  // Soal 2b: klik tombol X -> hapus dari localStorage & perbarui daftar
  $("#favorites").on("click", ".btn-delete", function (e) {
    e.stopPropagation(); // supaya tidak ikut memicu klik pada item
    const city = $(this).closest(".fav-item").data("city");
    removeFavorite(city);
  });

  // Soal 3: switch Celsius / Fahrenheit
  $("#unitToggle").on("change", function () {
    useFahrenheit = $(this).is(":checked");
    localStorage.setItem(unitKey, useFahrenheit ? "F" : "C");
    updateUnitLabel();

    // render ulang data yang sudah ada tanpa memanggil API lagi
    if (lastCurrent) displayCurrent(lastCurrent);
    if (lastForecast) displayForecast(lastForecast);
  });

  // Soal 4: toggle dark mode + simpan di localStorage
  $("#darkModeToggle").on("click", function () {
    const isDark = $("html").attr("data-bs-theme") !== "dark";
    applyDarkMode(isDark);
    localStorage.setItem(darkModeKey, isDark);
  });
});

function fetchWeather(city) {
  const q = encodeURIComponent(city);

  // Current weather
  $.getJSON(
    `https://api.openweathermap.org/data/2.5/weather?q=${q}&appid=${apiKey}&units=metric`
  )
    .done(function (data) {
      lastCurrent = data;
      displayCurrent(data);
      addFavorite(city);

      // Forecast hanya diambil jika kota ditemukan (menghindari 2x modal error)
      $.getJSON(
        `https://api.openweathermap.org/data/2.5/forecast?q=${q}&appid=${apiKey}&units=metric`
      )
        .done(function (data) {
          lastForecast = data.list;
          displayForecast(data.list);
        })
        .fail(function (xhr) {
          handleApiError(xhr, city);
        });
    })
    .fail(function (xhr) {
      // Soal 1b: API mengembalikan 404 atau error lain
      handleApiError(xhr, city);
    });
}

function handleApiError(xhr, city) {
  let message;

  if (xhr.status === 404) {
    message = `Kota "${city}" tidak ditemukan. Periksa kembali penulisan nama kota.`;
  } else if (xhr.status === 401) {
    message = "API key tidak valid atau belum aktif. Periksa API key di app.js.";
  } else if (xhr.status === 0) {
    message = "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
  } else {
    const apiMsg = xhr.responseJSON && xhr.responseJSON.message;
    message = `Terjadi kesalahan (status ${xhr.status})${apiMsg ? ": " + apiMsg : ""}.`;
  }

  showError(message);
}

function showError(message) {
  $("#errorModalBody").text(message);
  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("errorModal"));
  modal.show();
}

// Konversi suhu (API selalu diminta dalam Celsius / metric)
function formatTemp(celsius) {
  if (useFahrenheit) {
    return `${((celsius * 9) / 5 + 32).toFixed(1)} °F`;
  }
  return `${celsius.toFixed(1)} °C`;
}

function updateUnitLabel() {
  $("#unitLabel").text(useFahrenheit ? "Fahrenheit (°F)" : "Celsius (°C)");
}

function applyDarkMode(isDark) {
  $("html").attr("data-bs-theme", isDark ? "dark" : "light");
  $("#darkModeToggle").text(isDark ? "☀️ Light Mode" : "🌙 Dark Mode");
}

function displayCurrent(data) {
  $("#currentWeather").html(`
    <div class="card p-3 shadow-sm">
      <h3>${data.name}</h3>
      <p>${data.weather[0].description}</p>
      <h2>${formatTemp(data.main.temp)}</h2>
      <p>Humidity: ${data.main.humidity}% | Wind: ${data.wind.speed} m/s</p>
    </div>`);
}

function displayForecast(list) {
  // pick one data point per day (every 8*3h = 24h)
  const days = list.filter((_, i) => i % 8 === 0).slice(0, 5);

  let html = "";

  days.forEach((d) => {
    const date = new Date(d.dt * 1000).toLocaleDateString();
    html += `
      <div class="col-md forecast-card">
        <div class="card p-2 text-center">
          <h6>${date}</h6>
          <img src="https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png" alt="${d.weather[0].description}" class="mx-auto">
          <p>${formatTemp(d.main.temp)}</p>
        </div>
      </div>`;
  });

  $("#forecast").html(html);
}

function getFavorites() {
  return JSON.parse(localStorage.getItem(favoritesKey) || "[]");
}

function addFavorite(city) {
  let favs = getFavorites();
  if (!favs.includes(city)) {
    favs.push(city);
    localStorage.setItem(favoritesKey, JSON.stringify(favs));
    loadFavorites();
  }
}

function removeFavorite(city) {
  const favs = getFavorites().filter((c) => c !== city);
  localStorage.setItem(favoritesKey, JSON.stringify(favs));
  loadFavorites();
}

function loadFavorites() {
  const favs = getFavorites();

  // Soal 2a: setiap item punya tombol X
  const $list = $("#favorites").empty();

  favs.forEach((c) => {
    const $li = $(`
      <li class="list-group-item list-group-item-action fav-item d-flex justify-content-between align-items-center">
        <span></span>
        <button type="button" class="btn btn-sm btn-outline-danger btn-delete" title="Hapus">&times;</button>
      </li>`);
    $li.attr("data-city", c);
    $li.find("span").text(c); // .text() agar aman dari HTML injection
    $list.append($li);
  });
}
