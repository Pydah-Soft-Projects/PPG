import { useState, useEffect } from 'react';
import { collegesApi } from '../api/colleges.api';
import { providersApi } from '../api/providers.api';
import { applicationsApi } from '../api/applications.api';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useToast } from '../context/ToastContext';

export function CollegesRoutingView() {
  const [dbStatus, setDbStatus] = useState(null);
  const [colleges, setColleges] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [routingRules, setRoutingRules] = useState([]);
  const [providers, setProviders] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Routing Modal State (Unified for Create and Edit modes)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [editingRule, setEditingRule] = useState(null);
  const [saving, setSaving] = useState(false);

  // Modal Step Form State
  const [selectedApplicationId, setSelectedApplicationId] = useState('');
  const [selectedCollegeIds, setSelectedCollegeIds] = useState([]);
  const [collegeSearchFilter, setCollegeSearchFilter] = useState('');
  const [modalCourses, setModalCourses] = useState([]);
  const [modalCoursesLoading, setModalCoursesLoading] = useState(false);
  const [courseScope, setCourseScope] = useState('ALL'); // 'ALL' or 'SPECIFIC'
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [ruleStatus, setRuleStatus] = useState('ACTIVE');
  const [notes, setNotes] = useState('');

  const toast = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [statusRes, collegesRes, rulesRes, providersRes, appsRes] =
        await Promise.allSettled([
          collegesApi.getDbStatus(),
          collegesApi.getColleges(),
          collegesApi.getRoutingRules(),
          providersApi.list(),
          applicationsApi.list(),
        ]);

      if (statusRes.status === 'fulfilled') setDbStatus(statusRes.value.data);
      if (collegesRes.status === 'fulfilled') setColleges(collegesRes.value.data || []);
      if (rulesRes.status === 'fulfilled') setRoutingRules(rulesRes.value.data || []);
      if (providersRes.status === 'fulfilled') setProviders(providersRes.value.data || []);
      if (appsRes.status === 'fulfilled') setApplications(appsRes.value.data || []);
    } catch (err) {
      toast.error('Failed to load colleges data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectCollegeInCatalog = async (college) => {
    setSelectedCollege(college);
    try {
      setCoursesLoading(true);
      const res = await collegesApi.getCourses(college.id);
      setCourses(res.data || []);
    } catch (err) {
      toast.error('Failed to load courses: ' + err.message);
    } finally {
      setCoursesLoading(false);
    }
  };

  // Open Modal (Create Mode)
  const openRoutingModal = (preselectedCollege = null, preselectedCourse = null) => {
    setModalMode('create');
    setEditingRule(null);
    setSelectedApplicationId(applications[0]?._id || applications[0]?.id || '');
    const initialCollegeIds = preselectedCollege ? [preselectedCollege.id] : [];
    setSelectedCollegeIds(initialCollegeIds);
    setCollegeSearchFilter('');

    if (preselectedCourse) {
      setCourseScope('SPECIFIC');
      setSelectedCourseIds([preselectedCourse.id]);
    } else {
      setCourseScope('ALL');
      setSelectedCourseIds([]);
    }

    const activeProviders = providers.filter((p) => p.status === 'ACTIVE');
    const defaultProviderId = activeProviders[0]?._id || activeProviders[0]?.id || '';
    setSelectedProviderId(defaultProviderId);
    setRuleStatus('ACTIVE');
    setNotes('');

    if (initialCollegeIds.length > 0) {
      fetchCoursesForColleges(initialCollegeIds);
    } else {
      setModalCourses([]);
    }

    setIsModalOpen(true);
  };

  // Open Modal (Edit Mode)
  const openEditRuleModal = (rule) => {
    setModalMode('edit');
    setEditingRule(rule);
    // Application is locked in edit mode
    setSelectedApplicationId(rule.applicationId?._id || rule.applicationId?.id || '');

    const initialCollegeIds = rule.collegeId ? [rule.collegeId] : [];
    setSelectedCollegeIds(initialCollegeIds);
    setCollegeSearchFilter('');

    if (rule.courseCode) {
      setCourseScope('SPECIFIC');
      setSelectedCourseIds(rule.courseId ? [rule.courseId] : []);
    } else {
      setCourseScope('ALL');
      setSelectedCourseIds([]);
    }

    const activeProviders = providers.filter((p) => p.status === 'ACTIVE');
    const ruleProvId = rule.providerConfigurationId?._id || rule.providerConfigurationId?.id || '';
    const isProvActive = activeProviders.some((p) => (p.id || p._id) === ruleProvId);
    setSelectedProviderId(isProvActive ? ruleProvId : (activeProviders[0]?._id || activeProviders[0]?.id || ''));
    setRuleStatus(rule.status || 'ACTIVE');
    setNotes(rule.notes || '');

    if (initialCollegeIds.length > 0) {
      fetchCoursesForColleges(initialCollegeIds);
    } else {
      setModalCourses([]);
    }

    setIsModalOpen(true);
  };

  // Fetch courses for all currently selected colleges in modal
  const fetchCoursesForColleges = async (collegeIds) => {
    if (!collegeIds || collegeIds.length === 0) {
      setModalCourses([]);
      return;
    }

    try {
      setModalCoursesLoading(true);
      const promises = collegeIds.map((cid) => collegesApi.getCourses(cid));
      const results = await Promise.allSettled(promises);

      const allCourses = [];
      results.forEach((res) => {
        if (res.status === 'fulfilled' && Array.isArray(res.value?.data)) {
          allCourses.push(...res.value.data);
        }
      });

      setModalCourses(allCourses);
    } catch (err) {
      toast.error('Failed to load courses for selected colleges: ' + err.message);
    } finally {
      setModalCoursesLoading(false);
    }
  };

  // College Checkbox Toggle
  const handleToggleCollege = (collegeId) => {
    const isChecked = selectedCollegeIds.includes(collegeId);
    let updatedIds;
    if (isChecked) {
      updatedIds = selectedCollegeIds.filter((id) => id !== collegeId);
      // Remove any selected courses belonging to unselected college
      const remainingCollegesCourses = modalCourses.filter((c) =>
        updatedIds.includes(c.college_id)
      );
      setSelectedCourseIds((prev) =>
        prev.filter((crsId) =>
          remainingCollegesCourses.some((c) => c.id === crsId)
        )
      );
    } else {
      updatedIds = [...selectedCollegeIds, collegeId];
    }

    setSelectedCollegeIds(updatedIds);
    fetchCoursesForColleges(updatedIds);
  };

  const handleSelectAllColleges = () => {
    const allIds = filteredModalColleges.map((c) => c.id);
    const combined = Array.from(new Set([...selectedCollegeIds, ...allIds]));
    setSelectedCollegeIds(combined);
    fetchCoursesForColleges(combined);
  };

  const handleClearAllColleges = () => {
    setSelectedCollegeIds([]);
    setModalCourses([]);
    setSelectedCourseIds([]);
  };

  // Course Checkbox Toggle (Supports selecting multiple in both Add and Edit modes)
  const handleToggleCourse = (courseId) => {
    if (selectedCourseIds.includes(courseId)) {
      setSelectedCourseIds(selectedCourseIds.filter((id) => id !== courseId));
    } else {
      setSelectedCourseIds([...selectedCourseIds, courseId]);
    }
  };

  const handleSelectAllCourses = () => {
    setSelectedCourseIds(modalCourses.map((c) => c.id));
  };

  const handleClearAllCourses = () => {
    setSelectedCourseIds([]);
  };

  // Save Routing Rules (Handles both Create and Edit)
  const handleSaveRouting = async (e) => {
    e.preventDefault();

    if (selectedCollegeIds.length === 0) {
      toast.error('Please select at least one college checkbox.');
      return;
    }
    if (!selectedProviderId) {
      toast.error('Please select a Payment Account.');
      return;
    }

    try {
      setSaving(true);

      const targetColleges = colleges.filter((c) => selectedCollegeIds.includes(c.id));
      const targetCourses =
        courseScope === 'SPECIFIC'
          ? modalCourses.filter((c) => selectedCourseIds.includes(c.id))
          : [];

      if (courseScope === 'SPECIFIC' && targetCourses.length === 0) {
        toast.error('Please select at least one course checkbox, or choose "All Courses (College-Wide default)".');
        setSaving(false);
        return;
      }

      if (modalMode === 'edit' && editingRule) {
        // Edit Mode: update rule (application is locked & immutable)
        const college = targetColleges[0];
        const primaryCourse = targetCourses[0] || null;

        const payload = {
          collegeId: college.id,
          collegeCode: college.code,
          collegeName: college.name,
          courseScope: courseScope,
          courseId: primaryCourse ? primaryCourse.id : null,
          courseCode: primaryCourse ? primaryCourse.code : null,
          courseName: primaryCourse ? primaryCourse.name : null,
          providerConfigurationId: selectedProviderId,
          status: ruleStatus,
          notes: notes.trim(),
        };

        await collegesApi.updateRoutingRule(editingRule._id, payload);

        // If multiple colleges or multiple courses were selected in edit mode:
        // Rule 1 was updated with college + primaryCourse. Now batch create/upsert the remaining ones.
        const remainingColleges = targetColleges.slice(1);
        const additionalFirstCollegeCourses = targetCourses.filter(
          (c, idx) => idx > 0 && c.college_id === college.id
        );

        if (courseScope === 'ALL') {
          if (remainingColleges.length > 0) {
            await collegesApi.batchUpsertRoutingRules({
              applicationId:
                editingRule.applicationId?._id ||
                editingRule.applicationId?.id ||
                editingRule.applicationId ||
                null,
              colleges: remainingColleges.map((c) => ({
                id: c.id,
                code: c.code,
                name: c.name,
              })),
              courses: [],
              providerConfigurationId: selectedProviderId,
              status: ruleStatus,
              notes: notes.trim(),
            });
          }
        } else {
          // Specific courses scope
          const extraCourses = [
            ...additionalFirstCollegeCourses,
            ...targetCourses.filter((c) => remainingColleges.some((col) => col.id === c.college_id)),
          ];

          if (extraCourses.length > 0) {
            const relevantColleges = targetColleges.filter((col) =>
              extraCourses.some((c) => c.college_id === col.id)
            );

            await collegesApi.batchUpsertRoutingRules({
              applicationId:
                editingRule.applicationId?._id ||
                editingRule.applicationId?.id ||
                editingRule.applicationId ||
                null,
              colleges: relevantColleges.map((c) => ({
                id: c.id,
                code: c.code,
                name: c.name,
              })),
              courses: extraCourses.map((c) => ({
                id: c.id,
                collegeId: c.college_id,
                code: c.code,
                name: c.name,
              })),
              providerConfigurationId: selectedProviderId,
              status: ruleStatus,
              notes: notes.trim(),
            });
          }
        }

        toast.success('Routing rule(s) updated successfully!');
      } else {
        // Create Mode: batch insert rules
        const payload = {
          applicationId: selectedApplicationId || null,
          colleges: targetColleges.map((c) => ({
            id: c.id,
            code: c.code,
            name: c.name,
          })),
          courses: targetCourses.map((c) => ({
            id: c.id,
            collegeId: c.college_id,
            code: c.code,
            name: c.name,
          })),
          providerConfigurationId: selectedProviderId,
          status: ruleStatus,
          notes: notes.trim(),
        };

        await collegesApi.batchUpsertRoutingRules(payload);
        toast.success('Payment routing rules saved successfully!');
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Failed to save routing: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRuleStatus = async (rule) => {
    const newStatus = rule.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await collegesApi.updateRoutingRule(rule._id, { status: newStatus });
      toast.success(`Rule marked ${newStatus}`);
      loadData();
    } catch (err) {
      toast.error('Failed to toggle rule status: ' + err.message);
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment routing rule?')) return;
    try {
      await collegesApi.deleteRoutingRule(id);
      toast.success('Routing rule deleted');
      loadData();
    } catch (err) {
      toast.error('Failed to delete rule: ' + err.message);
    }
  };

  // Filtered Colleges in Catalog
  const filteredCatalogColleges = colleges.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.code?.toLowerCase().includes(q) ||
      c.website?.toLowerCase().includes(q)
    );
  });

  // Filtered Colleges in Modal
  const filteredModalColleges = colleges.filter((c) => {
    if (!collegeSearchFilter) return true;
    const q = collegeSearchFilter.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q);
  });

  // Only display ACTIVE payment accounts in the routing dropdown
  const activeProviders = providers.filter((p) => p.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* RDS Connection Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
              dbStatus?.connected
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-amber-50 text-amber-600 border border-amber-200'
            }`}
          >
            {dbStatus?.connected ? '🗄️' : '⚠️'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">AWS RDS Student Database</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  dbStatus?.connected
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {dbStatus?.connected ? 'Connected' : 'Credentials Needed'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              {dbStatus?.host || 'student-database.cfu0qmo26gh3.ap-south-1.rds.amazonaws.com'} &bull; DB:{' '}
              {dbStatus?.database || 'student_database'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
          >
            🔄 Refresh Status
          </button>
          <button
            onClick={() => openRoutingModal()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
          >
            + Add Routing
          </button>
        </div>
      </div>

      {!dbStatus?.connected && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
          <span className="text-base">💡</span>
          <div>
            <span className="font-semibold">MySQL Student Database Notice: </span>
            {dbStatus?.message || 'Set DB_PASSWORD in backend/.env to query live RDS tables.'}{' '}
            Routing rules can still be configured and resolved dynamically by College Code and Course Code!
          </div>
        </div>
      )}

      {/* Active Routing Rules Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Configured Payment Routing Hierarchy</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automatically routes incoming student fee payments to the designated payment account.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
            {routingRules.length} Active Rules
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Application</th>
                <th className="px-6 py-3.5">College</th>
                <th className="px-6 py-3.5">Course / Scope</th>
                <th className="px-6 py-3.5">Payment Account</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Notes</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {routingRules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No routing rules configured yet. Click <strong>&quot;+ Add Routing&quot;</strong> to link an application, colleges, and courses to a payment account.
                  </td>
                </tr>
              ) : (
                routingRules.map((rule) => {
                  const prov = rule.providerConfigurationId;
                  const isCollegeWide = !rule.courseCode;

                  return (
                    <tr key={rule._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5">
                        {rule.applicationId ? (
                          <div className="font-semibold text-slate-900">
                            {rule.applicationId.name}
                            <span className="font-mono text-[10px] text-slate-400 ml-1">
                              ({rule.applicationId.code})
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            All Applications (Global)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-slate-900">{rule.collegeName}</div>
                        <div className="font-mono text-[11px] text-slate-500">{rule.collegeCode}</div>
                      </td>
                      <td className="px-6 py-3.5">
                        {isCollegeWide ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            🏫 All Courses (College-Wide)
                          </span>
                        ) : (
                          <div>
                            <span className="font-semibold text-slate-800">
                              {rule.courseName || rule.courseCode}
                            </span>
                            <div className="font-mono text-[11px] text-slate-500">{rule.courseCode}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {prov ? (
                          <div>
                            <div className="font-semibold text-indigo-600 flex items-center gap-1.5">
                              <span>{prov.provider === 'RAZORPAY' ? '⚡' : '💳'}</span>
                              <span>{prov.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {prov.provider} &bull; {prov.environment}
                              {prov.accountNumber && (
                                <span className="font-mono text-slate-700 ml-1">
                                  (A/C: {prov.accountNumber})
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-amber-600 font-semibold">Account Deleted</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <button
                          onClick={() => handleToggleRuleStatus(rule)}
                          title="Click to toggle Active / Inactive"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <Badge status={rule.status} />
                        </button>
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 max-w-xs truncate">
                        {rule.notes || '—'}
                      </td>
                      <td className="px-6 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => openEditRuleModal(rule)}
                          className="text-xs text-indigo-600 hover:underline font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleRuleStatus(rule)}
                          className={`text-xs hover:underline font-semibold ${
                            rule.status === 'ACTIVE' ? 'text-amber-600' : 'text-emerald-600'
                          }`}
                        >
                          {rule.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule._id)}
                          className="text-xs text-rose-600 hover:underline font-semibold"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Colleges & Courses Directory (Live from RDS MySQL) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Colleges &amp; Courses Catalog</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Directly fetched from RDS MySQL tables <code>colleges</code> and <code>courses</code>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search colleges catalog..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 min-h-[300px]">
          {/* Colleges List */}
          <div className="p-4 overflow-y-auto max-h-[450px] space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Select College ({filteredCatalogColleges.length})
            </div>

            {loading ? (
              <div className="text-xs text-slate-400 p-4 text-center">Loading colleges...</div>
            ) : filteredCatalogColleges.length === 0 ? (
              <div className="text-xs text-slate-400 p-4 text-center">
                {colleges.length === 0
                  ? 'No colleges returned from database yet.'
                  : 'No colleges match your search.'}
              </div>
            ) : (
              filteredCatalogColleges.map((col) => {
                const isSelected = selectedCollege?.id === col.id;
                const hasRule = routingRules.some((r) => r.collegeCode === col.code);

                return (
                  <div
                    key={col.id}
                    onClick={() => handleSelectCollegeInCatalog(col)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-slate-900 text-xs">{col.name}</div>
                      {hasRule && (
                        <span
                          className="shrink-0 w-2 h-2 rounded-full bg-emerald-500"
                          title="Routing rule active"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-mono">
                      <span>Code: {col.code}</span>
                      {col.contact && <span>&bull; {col.contact}</span>}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                        {col.website || 'No website'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openRoutingModal(col);
                        }}
                        className="text-[11px] text-indigo-600 font-semibold hover:underline"
                      >
                        + Route College
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Courses List for Selected College */}
          <div className="p-4 md:col-span-2 overflow-y-auto max-h-[450px]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Associated Courses
                </div>
                {selectedCollege && (
                  <div className="text-xs font-semibold text-slate-800 mt-0.5">
                    {selectedCollege.name} ({courses.length} courses)
                  </div>
                )}
              </div>

              {selectedCollege && (
                <button
                  onClick={() => openRoutingModal(selectedCollege)}
                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold"
                >
                  + Route This College
                </button>
              )}
            </div>

            {!selectedCollege ? (
              <div className="text-xs text-slate-400 p-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
                👈 Select a college from the left list to view its courses and map dedicated payment accounts.
              </div>
            ) : coursesLoading ? (
              <div className="text-xs text-slate-400 p-8 text-center">Loading courses from MySQL...</div>
            ) : courses.length === 0 ? (
              <div className="text-xs text-slate-400 p-8 text-center">
                No active courses found for this college in RDS database.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {courses.map((crs) => {
                  const rule = routingRules.find(
                    (r) => r.collegeCode === selectedCollege.code && r.courseCode === crs.code
                  );

                  return (
                    <div
                      key={crs.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900 text-xs">{crs.name}</span>
                          <span className="px-1.5 py-0.5 uppercase text-[9px] font-bold rounded bg-slate-200 text-slate-700">
                            {crs.level || 'Course'}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-1">
                          Code: {crs.code} &bull; Years: {crs.total_years || '—'}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                        {rule ? (
                          <div className="text-[11px] text-emerald-700 font-medium truncate max-w-[130px]">
                            ⚡ {rule.providerConfigurationId?.name || 'Mapped'}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400">Inherits College default</div>
                        )}

                        <button
                          onClick={() => openRoutingModal(selectedCollege, crs)}
                          className="text-[11px] text-indigo-600 font-semibold hover:underline"
                        >
                          {rule ? 'Edit Route' : '+ Route Course'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unified Add / Edit Routing Modal (with Checkboxes for Colleges & Courses) */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={modalMode === 'edit' ? 'Edit Payment Routing' : 'Add Payment Routing'}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSaveRouting} className="space-y-4 text-xs">
            {/* Step 1: Select Application */}
            <div>
              {modalMode === 'edit' ? (
                <div className="p-3 bg-slate-100/90 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      1. Application (Locked)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600 flex items-center gap-1">
                      🔒 Cannot be changed
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900 text-sm">
                    {editingRule?.applicationId?.name || 'All Applications (Global Default)'}
                    {editingRule?.applicationId?.code && (
                      <span className="font-mono text-slate-500 font-normal text-xs ml-1">
                        ({editingRule.applicationId.code})
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-800 uppercase tracking-wider mb-1">
                    1. Select Application *
                  </label>
                  <select
                    value={selectedApplicationId}
                    onChange={(e) => setSelectedApplicationId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                  >
                    <option value="">All Applications (Global Default)</option>
                    {applications.map((app) => {
                      const appId = app.id || app._id;
                      return (
                        <option key={appId} value={appId}>
                          {app.name} ({app.code})
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Target application originating the payment order.
                  </p>
                </div>
              )}
            </div>

            {/* Step 2: Select Colleges with Checkboxes */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block font-bold text-slate-800 uppercase tracking-wider">
                    2. Select Colleges (with Checkboxes) *
                  </label>
                  <span className="text-[11px] text-indigo-600 font-semibold">
                    {selectedCollegeIds.length} college(s) selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllColleges}
                    className="text-[11px] text-indigo-600 hover:underline font-semibold"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleClearAllColleges}
                    className="text-[11px] text-slate-500 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* College Search input */}
              <input
                type="text"
                placeholder="Filter colleges list..."
                value={collegeSearchFilter}
                onChange={(e) => setCollegeSearchFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
              />

              {/* Colleges Checkboxes Container */}
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-white space-y-1.5">
                {filteredModalColleges.length === 0 ? (
                  <div className="text-slate-400 text-center py-2 text-[11px]">
                    No colleges found.
                  </div>
                ) : (
                  filteredModalColleges.map((col) => {
                    const isChecked = selectedCollegeIds.includes(col.id);
                    return (
                      <label
                        key={col.id}
                        className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-indigo-50/70 border border-indigo-200'
                            : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCollege(col.id)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-slate-900 block truncate">
                            {col.name}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            Code: {col.code}
                          </span>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Step 3: Select Courses with Checkboxes (based on selected colleges) */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block font-bold text-slate-800 uppercase tracking-wider">
                    3. Courses Scope &amp; Checkboxes
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {courseScope === 'ALL'
                      ? 'Applying to all courses for selected college(s)'
                      : `${selectedCourseIds.length} course(s) selected`}
                  </span>
                </div>
              </div>

              {/* Toggle: All Courses vs Specific Courses */}
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="modalCourseScope"
                    checked={courseScope === 'ALL'}
                    onChange={() => setCourseScope('ALL')}
                    className="text-indigo-600"
                  />
                  <span>All Courses (College-Wide default)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="modalCourseScope"
                    checked={courseScope === 'SPECIFIC'}
                    onChange={() => setCourseScope('SPECIFIC')}
                    className="text-indigo-600"
                  />
                  <span>Select Specific Courses (with Checkboxes)</span>
                </label>
              </div>

              {/* Courses Checkboxes Container */}
              {courseScope === 'SPECIFIC' && (
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Available Courses from Selected College(s):
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllCourses}
                        className="text-[11px] text-indigo-600 hover:underline font-semibold"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleClearAllCourses}
                        className="text-[11px] text-slate-500 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {modalCoursesLoading ? (
                    <div className="text-center py-4 text-slate-400">Loading courses...</div>
                  ) : modalCourses.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 border border-slate-200 rounded-lg bg-white">
                      {selectedCollegeIds.length === 0
                        ? 'Select one or more colleges above to display their courses.'
                        : 'No courses found for the selected college(s).'}
                    </div>
                  ) : (
                    <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-white space-y-1.5">
                      {modalCourses.map((crs) => {
                        const isChecked = selectedCourseIds.includes(crs.id);
                        const coll = colleges.find((c) => c.id === crs.college_id);

                        return (
                          <label
                            key={crs.id}
                            className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-indigo-50/70 border border-indigo-200'
                                : 'hover:bg-slate-50 border border-transparent'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleCourse(crs.id)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-slate-900 truncate">
                                  {crs.name}
                                </span>
                                <span className="px-1.5 py-0.2 uppercase text-[9px] font-bold rounded bg-slate-100 text-slate-600 shrink-0">
                                  {crs.level || 'Course'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                                <span>Code: {crs.code}</span>
                                {coll && (
                                  <span className="text-indigo-600 font-sans">({coll.name})</span>
                                )}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 4: Select Payment Account */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-800 uppercase tracking-wider">
                  4. Select Payment Account *
                </label>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  {activeProviders.length} active account(s) available
                </span>
              </div>
              <select
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                required
              >
                <option value="">Select Active Payment Account</option>
                {activeProviders.map((p) => {
                  const provId = p.id || p._id;
                  return (
                    <option key={provId} value={provId}>
                      {p.name} — {p.provider} ({p.environment})
                      {p.accountNumber ? ` [A/C: ${p.accountNumber}]` : ''}
                    </option>
                  );
                })}
              </select>
              {activeProviders.length === 0 ? (
                <p className="text-xs text-rose-500 mt-1 font-semibold">
                  ⚠️ No active payment accounts found. Please activate an account in Payment Accounts first.
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Transactions from the selected colleges and courses will credit this account. Inactive accounts are excluded.
                </p>
              )}
            </div>

            {/* Step 5: Status & Notes */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Rule Status
                </label>
                <select
                  value={ruleStatus}
                  onChange={(e) => setRuleStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium"
                >
                  <option value="ACTIVE">ACTIVE (Receiving Transactions)</option>
                  <option value="INACTIVE">INACTIVE (Disabled)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engineering admissions routing"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {saving ? 'Saving...' : modalMode === 'edit' ? 'Save Changes' : 'Save Routing'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
