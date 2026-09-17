import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import "./App.css";

const gradePoints = {
  O: 10,
  S: 9,
  A: 8,
  B: 7,
  C: 6,
  D: 4,
  F: 0,
};

const makeAuthEmail = (id) =>
  `${id.trim().toLowerCase()}@grademate.app`;

const emptySubject = () => ({
  id: Date.now() + Math.random(),
  name: "",
  type: "Regular",
  credits: "",
  grade: "O",
});

function App() {
  // =========================
  // AUTH
  // =========================
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [registrationId, setRegistrationId] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // =========================
  // APP
  // =========================
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [results, setResults] = useState([]);

  const [profile, setProfile] = useState({
    registration_id: "",
    full_name: "",
    course: "B.Tech",
    branch: "CSE",
    passout_year: "2027",
    college: "",
  });

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  // =========================
  // CALCULATOR
  // =========================
  const [semester, setSemester] = useState("1-1");
  const [regulation, setRegulation] = useState("R23");
  const [subjects, setSubjects] = useState([emptySubject()]);
  const [calculatedResult, setCalculatedResult] = useState(null);
  const [editingResultId, setEditingResultId] = useState(null);
  const [viewingResultId, setViewingResultId] = useState(null);
  const [calculatorMessage, setCalculatorMessage] = useState("");

  // =========================
  // AUTH SESSION
  // =========================
  useEffect(() => {
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadResults();
      loadProfile();
    }
  }, [user]);

  // =========================
  // SESSION
  // =========================
  const checkSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    setUser(session?.user || null);
  };

  // =========================
  // LOGIN
  // =========================
  const handleLogin = async (e) => {
    e.preventDefault();

    setAuthError("");

    if (!registrationId.trim() || !password) {
      setAuthError("Please enter Registration ID and Password.");
      return;
    }

    setAuthLoading(true);

    const email = makeAuthEmail(registrationId);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setAuthLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    setRegistrationId("");
    setPassword("");
  };

  // =========================
  // REGISTER
  // =========================
  const handleRegister = async (e) => {
    e.preventDefault();

    setAuthError("");

    if (!registrationId.trim() || !password) {
      setAuthError("Please enter Registration ID and Password.");
      return;
    }

    if (password.length < 6) {
      setAuthError("Password must contain at least 6 characters.");
      return;
    }

    setAuthLoading(true);

    const email = makeAuthEmail(registrationId);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          registration_id: registrationId.trim(),
        },
      },
    });

    setAuthLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    if (data.user) {
      setAuthMode("login");
      setAuthError("");
      alert(
        "Registration successful! Now login with your Registration ID and Password."
      );
    }
  };

  // =========================
  // LOGOUT
  // =========================
  const handleLogout = async () => {
    await supabase.auth.signOut();

    setUser(null);
    setResults([]);

    setProfile({
      registration_id: "",
      full_name: "",
      course: "B.Tech",
      branch: "CSE",
      passout_year: "2027",
      college: "",
    });

    setCurrentPage("dashboard");
  };

  // =========================
  // LOAD RESULTS
  // =========================
  const loadResults = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("semester_results")
      .select("*")
      .eq("user_id", user.id)
      .order("semester", { ascending: true });

    if (error) {
      console.error("Load results error:", error);
      return;
    }

    setResults(data || []);
  };

  // =========================
  // LOAD PROFILE
  // =========================
  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Load profile error:", error);
      return;
    }

    if (data) {
      setProfile({
        registration_id: data.registration_id || "",
        full_name: data.full_name || "",
        course: data.course || "B.Tech",
        branch: data.branch || "CSE",
        passout_year: data.passout_year || "2027",
        college: data.college || "",
      });
    } else {
      setProfile((prev) => ({
        ...prev,
        registration_id:
          user.user_metadata?.registration_id || registrationId || "",
      }));
    }
  };

  // =========================
  // PROFILE SAVE
  // =========================
  const saveProfile = async (e) => {
    e.preventDefault();

    if (!user) return;

    if (!profile.registration_id.trim()) {
      setProfileMessage("Registration ID is required.");
      return;
    }

    setProfileLoading(true);
    setProfileMessage("");

    const profileData = {
      id: user.id,
      registration_id: profile.registration_id.trim(),
      full_name: profile.full_name.trim(),
      course: profile.course.trim(),
      branch: profile.branch.trim(),
      passout_year: profile.passout_year.trim(),
      college: profile.college.trim(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .upsert(profileData, { onConflict: "id" });

    setProfileLoading(false);

    if (error) {
      console.error("Profile save error:", error);
      setProfileMessage(error.message);
      return;
    }

    setProfileMessage("Profile saved successfully.");
  };

  // =========================
  // SUBJECT UPDATE
  // =========================
  const updateSubject = (id, field, value) => {
    setSubjects((prev) =>
      prev.map((subject) =>
        subject.id === id
          ? { ...subject, [field]: value }
          : subject
      )
    );
  };

  // =========================
  // ADD SUBJECT
  // =========================
  const addSubject = () => {
    setSubjects((prev) => [...prev, emptySubject()]);
  };

  // =========================
  // REMOVE SUBJECT
  // =========================
  const removeSubject = (id) => {
    if (subjects.length === 1) {
      alert("At least one subject is required.");
      return;
    }

    setSubjects((prev) =>
      prev.filter((subject) => subject.id !== id)
    );
  };

  // =========================
  // RESET CALCULATOR
  // =========================
  const resetCalculator = () => {
    setSemester("1-1");
    setRegulation("R23");
    setSubjects([emptySubject()]);
    setCalculatedResult(null);
    setEditingResultId(null);
    setViewingResultId(null);
    setCalculatorMessage("");
  };

  // =========================
  // CALCULATE SGPA
  // =========================
  const calculateSGPA = () => {
    setCalculatorMessage("");

    if (!subjects.length) {
      setCalculatorMessage("Please add subjects.");
      return;
    }

    let totalCredits = 0;
    let totalCreditPoints = 0;

    for (const subject of subjects) {
      const subjectName = subject.name.trim();

      if (!subjectName) {
        setCalculatorMessage("Please enter all subject names.");
        return;
      }

      const credits = Number(subject.credits);

      // Non-credit subject
      if (subject.type === "Non-Credit") {
        continue;
      }

      // Completed / RQ
      if (
        subject.grade === "Completed" ||
        subject.grade === "RQ"
      ) {
        continue;
      }

      if (subject.credits === "") {
        setCalculatorMessage(
          `Please enter credits for ${subjectName}.`
        );
        return;
      }

      if (credits < 0) {
        setCalculatorMessage(
          `Credits cannot be negative for ${subjectName}.`
        );
        return;
      }

      // Zero credit subject is allowed but ignored
      if (credits === 0) {
        continue;
      }

      if (!(subject.grade in gradePoints)) {
        setCalculatorMessage(
          `Please select a valid grade for ${subjectName}.`
        );
        return;
      }

      totalCredits += credits;

      totalCreditPoints +=
        credits * gradePoints[subject.grade];
    }

    if (totalCredits === 0) {
      setCalculatorMessage(
        "At least one subject with credits greater than 0 is required."
      );
      return;
    }

    const sgpa = totalCreditPoints / totalCredits;

    setCalculatedResult({
      sgpa: Number(sgpa.toFixed(2)),
      totalCredits,
      totalCreditPoints,
    });
  };

  // =========================
  // SAVE / UPDATE RESULT
  // =========================
  const saveSemesterResult = async () => {
    if (!user) {
      alert("Please login first.");
      return;
    }

    if (!calculatedResult) {
      alert("Please calculate SGPA first.");
      return;
    }

    setCalculatorMessage("");

    const resultData = {
      user_id: user.id,
      semester,
      regulation,
      total_credits: calculatedResult.totalCredits,
      total_credit_points: calculatedResult.totalCreditPoints,
      sgpa: calculatedResult.sgpa,

      subjects: subjects.map((subject) => ({
        name: subject.name,
        type: subject.type,
        credits: subject.credits,
        grade: subject.grade,
      })),
    };

    let error;

    if (editingResultId) {
      const response = await supabase
        .from("semester_results")
        .update(resultData)
        .eq("id", editingResultId)
        .eq("user_id", user.id);

      error = response.error;
    } else {
      const response = await supabase
        .from("semester_results")
        .upsert(resultData, {
          onConflict: "user_id,semester",
        });

      error = response.error;
    }

    if (error) {
      console.error("Save/update result error:", error);

      if (
        error.message?.includes("subjects") ||
        error.message?.includes("column")
      ) {
        setCalculatorMessage(
          "Database subjects column is missing. Please check Supabase SQL."
        );
      } else {
        setCalculatorMessage(error.message);
      }

      return;
    }

    await loadResults();

    alert(
      editingResultId
        ? "Semester result updated successfully!"
        : "Semester result saved successfully!"
    );

    resetCalculator();
    setCurrentPage("my-results");
  };

  // =========================
  // EDIT RESULT
  // =========================
  const editSemesterResult = (result) => {
    setSemester(result.semester);
    setRegulation(result.regulation);
    setEditingResultId(result.id);
    setViewingResultId(null);

    if (Array.isArray(result.subjects) && result.subjects.length > 0) {
      setSubjects(
        result.subjects.map((subject, index) => ({
          id: Date.now() + index + Math.random(),
          name: subject.name || "",
          type: subject.type || "Regular",
          credits:
            subject.credits === null ||
            subject.credits === undefined
              ? ""
              : subject.credits,
          grade: subject.grade || "O",
        }))
      );
    } else {
      setSubjects([emptySubject()]);

      alert(
        "This older result does not contain subject details. You can enter the subjects again and update the result."
      );
    }

    setCalculatedResult({
      sgpa: Number(result.sgpa),
      totalCredits: Number(result.total_credits),
      totalCreditPoints: Number(result.total_credit_points),
    });

    setCalculatorMessage("");
    setCurrentPage("sgpa");
  };

  // =========================
  // VIEW RESULT DETAILS
  // =========================
  const toggleResultDetails = (resultId) => {
    setViewingResultId((prev) =>
      prev === resultId ? null : resultId
    );
  };

  // =========================
  // DELETE RESULT
  // =========================
  const deleteSemesterResult = async (id) => {
    if (!user) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this semester result?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("semester_results")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Delete error:", error);
      alert(error.message);
      return;
    }

    setResults((prev) =>
      prev.filter((result) => result.id !== id)
    );

    if (viewingResultId === id) {
      setViewingResultId(null);
    }
  };

  // =========================
  // CGPA
  // =========================
  const calculateCGPA = () => {
    if (!results.length) return null;

    let totalCredits = 0;
    let totalCreditPoints = 0;

    results.forEach((result) => {
      totalCredits += Number(result.total_credits || 0);

      totalCreditPoints += Number(
        result.total_credit_points || 0
      );
    });

    if (totalCredits === 0) return null;

    return Number(
      (totalCreditPoints / totalCredits).toFixed(2)
    );
  };

  // =========================
  // PERCENTAGE
  // =========================
  const calculatePercentage = () => {
    const cgpa = calculateCGPA();

    if (cgpa === null) return null;

    return Number(
      ((cgpa - 0.5) * 10).toFixed(2)
    );
  };

  const cgpa = calculateCGPA();
  const percentage = calculatePercentage();

  // =========================
  // AUTH SCREEN
  // =========================
  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            🎓
          </div>

          <h1>GradeMate</h1>

          <p className="free-text">
            Student Academic Portal
          </p>

          <p>
            SGPA • CGPA • Percentage
          </p>

          <form
            className="auth-form"
            onSubmit={
              authMode === "login"
                ? handleLogin
                : handleRegister
            }
          >
            <label>Registration ID</label>

            <input
              type="text"
              placeholder="Enter Registration ID"
              value={registrationId}
              onChange={(e) =>
                setRegistrationId(e.target.value)
              }
            />

            <label>Password</label>

            <input
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

            {authError && (
              <div className="auth-error">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={authLoading}
            >
              {authLoading
                ? "Please wait..."
                : authMode === "login"
                ? "Login"
                : "Create Account"}
            </button>
          </form>

          <p className="auth-link">
            {authMode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}

            <button
              type="button"
              onClick={() => {
                setAuthMode(
                  authMode === "login"
                    ? "register"
                    : "login"
                );

                setAuthError("");
              }}
            >
              {authMode === "login"
                ? " Register"
                : " Login"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // =========================
  // SIDEBAR
  // =========================
  const menuItems = [
    {
      id: "dashboard",
      icon: "🏠",
      label: "Dashboard",
    },
    {
      id: "sgpa",
      icon: "🧮",
      label: "SGPA Calculator",
    },
    {
      id: "cgpa",
      icon: "📊",
      label: "CGPA Calculator",
    },
    {
      id: "percentage",
      icon: "📈",
      label: "Percentage",
    },
    {
      id: "my-results",
      icon: "📋",
      label: "My Results",
    },
    {
      id: "profile",
      icon: "👤",
      label: "Profile",
    },
  ];

  // =========================
  // DASHBOARD
  // =========================
  const renderDashboard = () => {
    return (
      <div className="dashboard-section">
        <h2 className="section-title">
          📊 Academic Overview
        </h2>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🎯</div>

            <div>
              <span>Overall CGPA</span>

              <strong>
                {cgpa !== null ? cgpa : "--"}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📈</div>

            <div>
              <span>Percentage</span>

              <strong>
                {percentage !== null
                  ? `${percentage}%`
                  : "--"}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📚</div>

            <div>
              <span>Semesters</span>

              <strong>{results.length}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🎓</div>

            <div>
              <span>Total Credits</span>

              <strong>
                {results.reduce(
                  (sum, result) =>
                    sum +
                    Number(result.total_credits || 0),
                  0
                )}
              </strong>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <h2 className="section-title">
            ⚡ Quick Actions
          </h2>

          <div className="quick-actions">
            <button
              onClick={() => {
                resetCalculator();
                setCurrentPage("sgpa");
              }}
            >
              🧮 Calculate SGPA
            </button>

            <button
              onClick={() =>
                setCurrentPage("cgpa")
              }
            >
              📊 View CGPA
            </button>

            <button
              onClick={() =>
                setCurrentPage("my-results")
              }
            >
              📋 My Results
            </button>

            <button
              onClick={() =>
                setCurrentPage("profile")
              }
            >
              👤 My Profile
            </button>
          </div>
        </div>

        <div className="dashboard-section">
          <h2 className="section-title">
            📝 Recent Results
          </h2>

          {results.length === 0 ? (
            <div className="empty-results">
              <h3>No semester results yet</h3>

              <p>
                Calculate your SGPA and save your
                semester result here.
              </p>

              <button
                onClick={() => {
                  resetCalculator();
                  setCurrentPage("sgpa");
                }}
              >
                Calculate First SGPA
              </button>
            </div>
          ) : (
            <div className="results-list">
              {results
                .slice(-3)
                .reverse()
                .map((result) => (
                  <div
                    className="result-list-row"
                    key={result.id}
                  >
                    <div>
                      <strong>
                        Semester {result.semester}
                      </strong>

                      <span>
                        {result.regulation}
                      </span>
                    </div>

                    <div>
                      <small>SGPA</small>

                      <strong>
                        {Number(result.sgpa).toFixed(2)}
                      </strong>
                    </div>

                    <button
                      className="delete-result-btn"
                      onClick={() =>
                        editSemesterResult(result)
                      }
                    >
                      ✏️ Edit
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // =========================
  // SGPA CALCULATOR
  // =========================
  const renderSGPA = () => {
    return (
      <div className="calculator-page">
        <div className="calculator-header">
          <h2>
            🧮{" "}
            {editingResultId
              ? "Update Semester Result"
              : "SGPA Calculator"}
          </h2>

          <p>
            Calculate your semester GPA using
            subject-wise credits and grades.
          </p>
        </div>

        <div className="selectors">
          <div>
            <label>Semester</label>

            <select
              value={semester}
              onChange={(e) =>
                setSemester(e.target.value)
              }
            >
              <option value="1-1">1-1</option>
              <option value="1-2">1-2</option>
              <option value="2-1">2-1</option>
              <option value="2-2">2-2</option>
              <option value="3-1">3-1</option>
              <option value="3-2">3-2</option>
              <option value="4-1">4-1</option>
              <option value="4-2">4-2</option>
            </select>
          </div>

          <div>
            <label>Regulation</label>

            <select
              value={regulation}
              onChange={(e) =>
                setRegulation(e.target.value)
              }
            >
              <option value="R23">R23</option>
              <option value="R20">R20</option>
            </select>
          </div>
        </div>

        <div className="subject-table">
          <div className="table-header">
            <span>Subject Name</span>
            <span>Type</span>
            <span>Credits</span>
            <span>Grade</span>
            <span>Action</span>
          </div>

          {subjects.map((subject) => (
            <div
              className="subject-row"
              key={subject.id}
            >
              <input
                type="text"
                placeholder="Subject name"
                value={subject.name}
                onChange={(e) =>
                  updateSubject(
                    subject.id,
                    "name",
                    e.target.value
                  )
                }
              />

              <select
                value={subject.type}
                onChange={(e) =>
                  updateSubject(
                    subject.id,
                    "type",
                    e.target.value
                  )
                }
              >
                <option value="Regular">
                  Regular
                </option>

                <option value="NPTEL">
                  NPTEL
                </option>

                <option value="Non-Credit">
                  Non-Credit
                </option>
              </select>

              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="Credits"
                value={subject.credits}
                onChange={(e) =>
                  updateSubject(
                    subject.id,
                    "credits",
                    e.target.value
                  )
                }
              />

              <select
                value={subject.grade}
                onChange={(e) =>
                  updateSubject(
                    subject.id,
                    "grade",
                    e.target.value
                  )
                }
              >
                <option value="">Select Grade</option>
                <option value="O">O - 10</option>
                <option value="S">S - 9</option>
                <option value="A">A - 8</option>
                <option value="B">B - 7</option>
                <option value="C">C - 6</option>
                <option value="D">D - 4</option>
                <option value="F">F - 0</option>

                <option value="Completed">
                  Completed
                </option>

                <option value="RQ">
                  RQ
                </option>
              </select>

              <button
                className="remove-btn"
                onClick={() =>
                  removeSubject(subject.id)
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          className="add-btn"
          onClick={addSubject}
        >
          + Add Subject
        </button>

        {calculatorMessage && (
          <div className="calculator-message">
            {calculatorMessage}
          </div>
        )}

        <div className="calculator-actions">
          <button
            className="calculate-main-btn"
            onClick={calculateSGPA}
          >
            Calculate SGPA
          </button>

          <button
            className="reset-btn"
            onClick={resetCalculator}
          >
            Reset Calculator
          </button>
        </div>

        {calculatedResult && (
          <div className="sgpa-result-card">
            <h3>
              {editingResultId
                ? "Updated Result Preview"
                : "SGPA Result"}
            </h3>

            <div className="result-details">
              <div>
                <span>Semester</span>
                <strong>{semester}</strong>
              </div>

              <div>
                <span>Regulation</span>
                <strong>{regulation}</strong>
              </div>

              <div>
                <span>Total Credits</span>
                <strong>
                  {calculatedResult.totalCredits}
                </strong>
              </div>

              <div>
                <span>Credit Points</span>
                <strong>
                  {calculatedResult.totalCreditPoints}
                </strong>
              </div>

              <div>
                <span>SGPA</span>
                <strong>
                  {calculatedResult.sgpa.toFixed(2)}
                </strong>
              </div>
            </div>

            <p className="formula">
              SGPA = Total Credit Points ÷ Total Credits
            </p>

            <button
              className="save-result-btn"
              onClick={saveSemesterResult}
            >
              {editingResultId
                ? "💾 Update Result"
                : "💾 Save Semester Result"}
            </button>
          </div>
        )}
      </div>
    );
  };

  // =========================
  // CGPA PAGE
  // =========================
  const renderCGPA = () => {
    return (
      <div className="calculator-page">
        <div className="calculator-header">
          <h2>📊 CGPA Calculator</h2>

          <p>
            Your overall CGPA is calculated from
            your saved semester results.
          </p>
        </div>

        {cgpa === null ? (
          <div className="empty-results">
            <h3>No semester results available</h3>

            <p>
              Save at least one semester result
              to calculate your CGPA.
            </p>

            <button
              onClick={() => {
                resetCalculator();
                setCurrentPage("sgpa");
              }}
            >
              Add Semester Result
            </button>
          </div>
        ) : (
          <div className="sgpa-result-card">
            <h3>Overall CGPA</h3>

            <div className="result-details">
              <div>
                <span>CGPA</span>
                <strong>
                  {cgpa.toFixed(2)}
                </strong>
              </div>

              <div>
                <span>Semesters</span>
                <strong>
                  {results.length}
                </strong>
              </div>

              <div>
                <span>Total Credits</span>

                <strong>
                  {results.reduce(
                    (sum, result) =>
                      sum +
                      Number(
                        result.total_credits || 0
                      ),
                    0
                  )}
                </strong>
              </div>

              <div>
                <span>Percentage</span>

                <strong>
                  {percentage !== null
                    ? `${percentage}%`
                    : "--"}
                </strong>
              </div>
            </div>

            <p className="formula">
              CGPA = Total Credit Points ÷ Total Credits
            </p>
          </div>
        )}
      </div>
    );
  };

  // =========================
  // PERCENTAGE PAGE
  // =========================
  const renderPercentage = () => {
    return (
      <div className="calculator-page">
        <div className="calculator-header">
          <h2>📈 Percentage Calculator</h2>

          <p>
            Convert your overall CGPA into
            percentage.
          </p>
        </div>

        {cgpa === null ? (
          <div className="empty-results">
            <h3>No CGPA available</h3>

            <p>
              Save semester results first.
            </p>
          </div>
        ) : (
          <div className="sgpa-result-card">
            <h3>CGPA to Percentage</h3>

            <div className="result-details">
              <div>
                <span>CGPA</span>

                <strong>
                  {cgpa.toFixed(2)}
                </strong>
              </div>

              <div>
                <span>Percentage</span>

                <strong>
                  {percentage.toFixed(2)}%
                </strong>
              </div>
            </div>

            <p className="formula">
              Percentage = (CGPA - 0.5) × 10
            </p>
          </div>
        )}
      </div>
    );
  };

  // =========================
  // SUBJECT DETAILS
  // =========================
  const renderSubjectDetails = (result) => {
    const subjectList = Array.isArray(result.subjects)
      ? result.subjects
      : [];

    if (subjectList.length === 0) {
      return (
        <div
          style={{
            marginTop: "18px",
            padding: "18px",
            borderRadius: "10px",
            background: "#f8f9fc",
            border: "1px solid #e2e8f0",
          }}
        >
          <strong>No subject details available</strong>

          <p
            style={{
              margin: "8px 0 0",
              color: "#718096",
              fontSize: "14px",
            }}
          >
            This result was saved before subject details
            were added. Edit the result and save it again
            to store subject details.
          </p>
        </div>
      );
    }

    return (
      <div
        style={{
          marginTop: "18px",
          padding: "18px",
          borderRadius: "10px",
          background: "#f8f9fc",
          border: "1px solid #e2e8f0",
        }}
      >
        <h4
          style={{
            margin: "0 0 15px",
            fontSize: "17px",
          }}
        >
          📚 Subject-wise Details
        </h4>

        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px",
                    borderBottom: "1px solid #d9dee8",
                  }}
                >
                  Subject
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "10px",
                    borderBottom: "1px solid #d9dee8",
                  }}
                >
                  Type
                </th>

                <th
                  style={{
                    textAlign: "center",
                    padding: "10px",
                    borderBottom: "1px solid #d9dee8",
                  }}
                >
                  Credits
                </th>

                <th
                  style={{
                    textAlign: "center",
                    padding: "10px",
                    borderBottom: "1px solid #d9dee8",
                  }}
                >
                  Grade
                </th>
              </tr>
            </thead>

            <tbody>
              {subjectList.map((subject, index) => (
                <tr key={index}>
                  <td
                    style={{
                      padding: "10px",
                      borderBottom:
                        "1px solid #edf0f5",
                    }}
                  >
                    {subject.name || "-"}
                  </td>

                  <td
                    style={{
                      padding: "10px",
                      borderBottom:
                        "1px solid #edf0f5",
                    }}
                  >
                    {subject.type || "Regular"}
                  </td>

                  <td
                    style={{
                      padding: "10px",
                      textAlign: "center",
                      borderBottom:
                        "1px solid #edf0f5",
                    }}
                  >
                    {subject.credits === ""
                      ? "-"
                      : subject.credits}
                  </td>

                  <td
                    style={{
                      padding: "10px",
                      textAlign: "center",
                      fontWeight: "600",
                      borderBottom:
                        "1px solid #edf0f5",
                    }}
                  >
                    {subject.grade || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // =========================
  // MY RESULTS
  // =========================
  const renderMyResults = () => {
    return (
      <div className="dashboard-section">
        <h2 className="section-title">
          📋 My Semester Results
        </h2>

        <p
          style={{
            color: "#718096",
            marginBottom: "25px",
          }}
        >
          All your saved semester results
        </p>

        {results.length === 0 ? (
          <div className="empty-results">
            <h3>No results saved</h3>

            <p>
              Your saved semester results will
              appear here.
            </p>

            <button
              onClick={() => {
                resetCalculator();
                setCurrentPage("sgpa");
              }}
            >
              Calculate SGPA
            </button>
          </div>
        ) : (
          <div className="results-list">
            {results.map((result) => (
              <div
                key={result.id}
                style={{
                  marginBottom: "14px",
                  border: "1px solid #e1e5ec",
                  borderRadius: "12px",
                  background: "#ffffff",
                  padding: "18px",
                }}
              >
                <div
                  className="result-list-row"
                  style={{
                    margin: 0,
                  }}
                >
                  <div>
                    <strong>
                      Semester {result.semester}
                    </strong>

                    <span>
                      Regulation {result.regulation}
                    </span>
                  </div>

                  <div>
                    <small>SGPA</small>

                    <strong>
                      {Number(result.sgpa).toFixed(2)}
                    </strong>
                  </div>

                  <div>
                    <small>Credits</small>

                    <strong>
                      {result.total_credits}
                    </strong>
                  </div>

                  <div className="result-actions">
                    <button
                      type="button"
                      className="edit-result-btn"
                      onClick={() =>
                        editSemesterResult(result)
                      }
                    >
                      ✏️ Edit
                    </button>

                    <button
                      type="button"
                      className="view-result-btn"
                      onClick={() =>
                        toggleResultDetails(result.id)
                      }
                    >
                      {viewingResultId === result.id
                        ? "Hide Details"
                        : "View Details"}
                    </button>

                    <button
                      type="button"
                      className="delete-result-btn"
                      onClick={() =>
                        deleteSemesterResult(result.id)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {viewingResultId === result.id &&
                  renderSubjectDetails(result)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // =========================
  // PROFILE
  // =========================
  const renderProfile = () => {
    return (
      <div className="calculator-page">
        <div className="calculator-header">
          <h2>👤 My Profile</h2>

          <p>
            Manage your academic profile details.
          </p>
        </div>

        <form
          className="profile-form"
          onSubmit={saveProfile}
        >
          <div className="profile-field">
            <label>Registration ID</label>

            <input
              type="text"
              value={profile.registration_id}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  registration_id:
                    e.target.value,
                })
              }
              placeholder="Registration ID"
            />
          </div>

          <div className="profile-field">
            <label>Full Name</label>

            <input
              type="text"
              value={profile.full_name}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  full_name: e.target.value,
                })
              }
              placeholder="Enter full name"
            />
          </div>

          <div className="profile-field">
            <label>Course</label>

            <input
              type="text"
              value={profile.course}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  course: e.target.value,
                })
              }
              placeholder="B.Tech"
            />
          </div>

          <div className="profile-field">
            <label>Branch</label>

            <input
              type="text"
              value={profile.branch}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  branch: e.target.value,
                })
              }
              placeholder="CSE"
            />
          </div>

          <div className="profile-field">
            <label>Pass-out Year</label>

            <input
              type="text"
              value={profile.passout_year}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  passout_year:
                    e.target.value,
                })
              }
              placeholder="2027"
            />
          </div>

          <div className="profile-field">
            <label>College</label>

            <input
              type="text"
              value={profile.college}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  college: e.target.value,
                })
              }
              placeholder="Enter college name"
            />
          </div>

          {profileMessage && (
            <div className="profile-success">
              {profileMessage}
            </div>
          )}

          <div className="profile-actions">
            <button
              type="submit"
              className="save-result-btn"
              disabled={profileLoading}
            >
              {profileLoading
                ? "Saving..."
                : "💾 Save Profile"}
            </button>
          </div>
        </form>
      </div>
    );
  };

  // =========================
  // PAGE CONTENT
  // =========================
  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return renderDashboard();

      case "sgpa":
        return renderSGPA();

      case "cgpa":
        return renderCGPA();

      case "percentage":
        return renderPercentage();

      case "my-results":
        return renderMyResults();

      case "profile":
        return renderProfile();

      default:
        return renderDashboard();
    }
  };

  // =========================
  // MAIN APP
  // =========================
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <h1>🎓 GradeMate</h1>

          <p className="brand-subtitle">
            Student Academic Portal
          </p>
        </div>

        <nav>
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`menu-item ${
                currentPage === item.id
                  ? "active"
                  : ""
              }`}
              onClick={() => {
                if (
                  item.id === "sgpa" &&
                  currentPage !== "sgpa"
                ) {
                  resetCalculator();
                }

                setCurrentPage(item.id);
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button
          className="logout-btn"
          onClick={handleLogout}
        >
          🚪 Logout
        </button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h2>
              {currentPage === "dashboard"
                ? "Dashboard"
                : currentPage === "sgpa"
                ? editingResultId
                  ? "Update Semester Result"
                  : "SGPA Calculator"
                : currentPage === "cgpa"
                ? "CGPA Calculator"
                : currentPage === "percentage"
                ? "Percentage"
                : currentPage === "my-results"
                ? "My Results"
                : "Profile"}
            </h2>

            <p>
              Welcome to your GradeMate academic
              dashboard
            </p>
          </div>

          <div className="student-profile">
            <div className="profile-avatar">
              {(
                profile.full_name ||
                profile.registration_id ||
                "P"
              )
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {profile.full_name ||
                  profile.registration_id ||
                  user.user_metadata
                    ?.registration_id ||
                  "Student"}
              </strong>

              <span>
                {profile.registration_id ||
                  user.user_metadata
                    ?.registration_id ||
                  ""}
              </span>
            </div>
          </div>
        </header>

        {renderPage()}
      </main>
    </div>
  );
}

export default App;