import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, updateProfile, changePassword, isEmailAvailable, verifyPassword } from '@/api/auth.api'
import { showToast } from '../../../components/ui/Toast'
import useAuthStore from '@/store/authStore'

export default function MyProfile() {
  const navigate = useNavigate()
  const { user: authUser, setUser: setAuthUser } = useAuthStore()
  const [user, setUser] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [emailAvailable, setEmailAvailable] = useState(true)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const fileInputRef = useRef(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [currentPwdError, setCurrentPwdError] = useState('')
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSending, setForgotSending] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [currentPwdValid, setCurrentPwdValid] = useState(null)
  const verifyTimer = useRef(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const ctxUser = authUser
      const u = ctxUser || await getCurrentUser()
      if (!mounted) return
      setUser(u)
      setName(u?.name || '')
      setEmail(u?.email || '')
      setPhone(u?.phone || '')
      try {
        if (u) {
          const ok = await isEmailAvailable(u.email)
          setEmailAvailable(Boolean(ok) || String(u.email) === String(u.email))
        }
      } catch (e) {}
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  function readFileAsDataUrl(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader()
      fr.onload = () => res(fr.result)
      fr.onerror = rej
      fr.readAsDataURL(file)
    })
  }

  async function handleImageUpload(e) {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    try {
      const data = await readFileAsDataUrl(f)
      setUser(u => ({ ...(u||{}), profileImage: data }))
      const id = (authUser && authUser.id) || (user && user.id)
      if (!id) throw new Error('No user id available')
      const updated = await updateProfile(id, { profileImage: data })
      if (setAuthUser) setAuthUser(updated)
      setUser(updated)
      showToast({ title: 'Saved', message: 'Profile image uploaded', type: 'success' })
    } catch (err) {
      showToast({ title: 'Error', message: 'Failed to upload image', type: 'error' })
    }
  }

  function openPreview() {
    setPreviewOpen(true)
  }
  function closePreview() {
    setPreviewOpen(false)
  }

  async function verifyCurrentPassword() {
    setCurrentPwdError('')
    setCurrentPwdValid(null)
    if (!currentPwd) return setCurrentPwdError('Enter current password to verify')
    try {
      const ok = await verifyPassword(currentPwd)
      if (!ok) {
        setCurrentPwdValid(false)
        setCurrentPwdError('Current password is incorrect. You cannot change the password.')
        return
      }
      setCurrentPwdValid(true)
      setCurrentPwdError('')
    } catch (err) {
      setCurrentPwdValid(false)
      setCurrentPwdError('Failed to verify current password')
    }
  }

  useEffect(() => {
    if (verifyTimer.current) clearTimeout(verifyTimer.current)
    if (!currentPwd) return
    if (currentPwdValid === true) return
    verifyTimer.current = setTimeout(() => {
      verifyCurrentPassword()
    }, 800)
    return () => clearTimeout(verifyTimer.current)
  }, [currentPwd])

  async function handleDeleteImage() {
    if (!user && !authUser) return showToast({ title: 'Error', message: 'No user', type: 'error' })
    const id = (authUser && authUser.id) || (user && user.id)
    try {
      const updated = await updateProfile(id, { profileImage: null })
      if (setAuthUser) setAuthUser(updated)
      setUser(updated)
      showToast({ title: 'Deleted', message: 'Profile image removed', type: 'success' })
      closePreview()
    } catch (err) {
      showToast({ title: 'Error', message: 'Failed to delete image', type: 'error' })
    }
  }

  async function handleDeleteAccount() {
    if (!user && !authUser) return showToast({ title: 'Error', message: 'No user', type: 'error' })
    try {
      const { deleteAccount } = await import('@/api/auth.api')
      await deleteAccount((authUser && authUser.id) || (user && user.id))
      showToast({ title: 'Deleted', message: 'Your account has been deleted', type: 'success' })
      window.location.href = '/'
    } catch (err) {
      showToast({ title: 'Error', message: err?.message || 'Failed to delete account', type: 'error' })
    }
  }

  useEffect(() => {
    if (!previewOpen) return
    function onKey(e) {
      if (e.key === 'Escape') closePreview()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previewOpen])

  async function handleSave(e) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    try {
      if (String(email || '').toLowerCase() !== String(user.email || '').toLowerCase()) {
        setCheckingEmail(true)
        const ok = await isEmailAvailable(email)
        setCheckingEmail(false)
        if (!ok) throw new Error('Email already in use')
      }
      const payload = { name, email, phone }
      const updated = await updateProfile(user.id, payload)
      if (setAuthUser) setAuthUser(updated)
      showToast({ title: 'Saved', message: 'Profile updated', type: 'success' })
      navigate('/student')
    } catch (err) {
      showToast({ title: 'Error', message: err?.message || 'Failed to save', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (!user) return
    if (!currentPwd || !newPwd) return showToast({ title: 'Error', message: 'Provide current and new password', type: 'error' })
    if (newPwd !== confirmPwd) return showToast({ title: 'Error', message: 'Passwords do not match', type: 'error' })
    const strong = validatePasswordStrength(newPwd)
    if (!strong.ok) return showToast({ title: 'Weak password', message: strong.message, type: 'error' })
    try {
      if (currentPwdValid !== true) {
        setCurrentPwdError('Please verify your current password before changing it.')
        return
      }
      await changePassword(user.id, currentPwd, newPwd)
      showToast({ title: 'Success', message: 'Password changed', type: 'success' })
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
      setCurrentPwdError('')
      setCurrentPwdValid(null)
    } catch (err) {
      const msg = err?.message || 'Failed to change password'
      showToast({ title: 'Error', message: msg, type: 'error' })
      // surface inline error for current password
      if (String(msg).toLowerCase().includes('current')) setCurrentPwdError(msg)
    }
  }

  function validatePasswordStrength(pw) {
    if (!pw || pw.length < 8) return { ok: false, message: 'Password must be at least 8 characters' }
    if (!/[A-Z]/.test(pw)) return { ok: false, message: 'Include at least one uppercase letter' }
    if (!/[a-z]/.test(pw)) return { ok: false, message: 'Include at least one lowercase letter' }
    if (!/\d/.test(pw)) return { ok: false, message: 'Include at least one number' }
    if (!/[!@#\$%\^&\*]/.test(pw)) return { ok: false, message: 'Include at least one special character like !@#$%' }
    return { ok: true }
  }

  if (loading) return <div className="p-3 sm:p-6">Loading profile…</div>

  return (
    <div className="p-3 sm:p-6 lg:p-10">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4">My Profile</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
              {user?.profileImage ? (
                <button type="button" onClick={openPreview} className="w-full h-full block focus:outline-none">
                  <img src={user.profileImage} alt="profile" className="w-full h-full object-cover" />
                </button>
              ) : (
                <div className="text-gray-500">No image</div>
              )}
            </div>
            <div className="w-full sm:w-auto">
              <label className="block text-sm text-gray-700">Upload profile image</label>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="mt-2 w-full text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700">Full name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
          </div>

          <div>
            <label className="block text-sm text-gray-700">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
            {!emailAvailable && <div className="text-xs text-red-600 mt-1">Email already in use</div>}
          </div>

          <div>
            <label className="block text-sm text-gray-700">Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button type="submit" disabled={saving} className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md">Save</button>
            <button type="button" onClick={() => navigate('/student')} className="w-full sm:w-auto px-4 py-2 border rounded-md">Cancel</button>
          </div>
        </form>

        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-3">Change password</h3>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <label className="block text-sm text-gray-700">Current password</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => { setForgotOpen(true); setForgotEmail(user?.email || '') }} className="text-sm text-blue-600 hover:underline">Forgot password?</button>
                </div>
              </div>
              <div className="mt-1">
                <input
                  type="password"
                  value={currentPwd}
                  onChange={e => { setCurrentPwd(e.target.value); if (currentPwdError) setCurrentPwdError(''); if (currentPwdValid) setCurrentPwdValid(null) }}
                  onBlur={verifyCurrentPassword}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); verifyCurrentPassword() } }}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              {currentPwdValid===true && <div className="text-xs text-green-600 mt-1">Current password verified.</div>}
              {currentPwdError && <div className="text-xs text-red-600 mt-1">{currentPwdError}</div>}
            </div>
            <div>
              <label className="block text-sm text-gray-700">New password</label>
              <input type="password" value={newPwd} onChange={e => { setNewPwd(e.target.value); const v = validatePasswordStrength(e.target.value); setPasswordError(v.ok ? '' : v.message) }} className="mt-1 w-full px-3 py-2 border rounded-md" disabled={currentPwdValid!==true} />
              {passwordError && <div className="text-xs text-red-600 mt-1">{passwordError}</div>}
            </div>
            <div>
              <label className="block text-sm text-gray-700">Confirm new password</label>
              <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" disabled={currentPwdValid!==true} />
            </div>
            <div>
              <button type="submit" disabled={currentPwdValid!==true} className={"w-full sm:w-auto px-4 py-2 rounded-md " + (currentPwdValid===true ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed')}>Change password</button>
            </div>
          </form>
        </div>
        <div className="mt-6 border-t pt-4">
          <h3 className="text-lg font-semibold mb-2">Danger zone</h3>
          <p className="text-sm text-gray-600 mb-3">Deleting your account will remove all your data from this demo. This action cannot be undone.</p>
          <button type="button" onClick={() => setDeleteOpen(true)} className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded">Delete account</button>
        </div>
      </div>
      {/* Image preview modal */}
      {previewOpen && user?.profileImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Profile image preview">
          <div className="absolute inset-0 bg-black/50" onClick={closePreview} />
          <div className="relative bg-white rounded-lg overflow-hidden max-w-3xl w-full mx-4">
            <div className="flex justify-end p-2">
              <button type="button" onClick={closePreview} aria-label="Close preview" className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="p-4 flex flex-col items-center gap-4">
              <img src={user.profileImage} alt="profile full" className="max-h-[60vh] object-contain" />
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <button type="button" onClick={() => fileInputRef.current && fileInputRef.current.click()} className="px-4 py-2 bg-indigo-600 text-white rounded">Change</button>
                <button type="button" onClick={handleDeleteImage} className="px-4 py-2 border rounded">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Forgot password modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Forgot password">
          <div className="absolute inset-0 bg-black/40" onClick={() => setForgotOpen(false)} />
          <div className="relative bg-white rounded-lg shadow max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Forgot password</h3>
              <button type="button" onClick={() => setForgotOpen(false)} className="text-gray-600">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700">Email</label>
                <input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-end">
                <button type="button" onClick={() => setForgotOpen(false)} className="px-3 py-2 border rounded">Cancel</button>
                <button type="button" onClick={async () => {
                  setForgotSending(true)
                  await new Promise(r => setTimeout(r, 700))
                  setForgotSending(false)
                  setForgotOpen(false)
                  showToast({ title: 'Sent', message: 'If an account exists, a reset link has been sent to the email address.', type: 'success' })
                }} disabled={forgotSending || !forgotEmail} className="px-3 py-2 bg-indigo-600 text-white rounded">{forgotSending ? 'Sending…' : 'Send reset link'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete account modal */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Delete account">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteOpen(false)} />
          <div className="relative bg-white rounded-lg shadow max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Delete account</h3>
              <button type="button" onClick={() => setDeleteOpen(false)} className="text-gray-600">✕</button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-700">This action is irreversible. To confirm, type <span className="font-mono">DELETE</span> below and click <span className="font-semibold">Delete account</span>.</p>
              <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" placeholder="Type DELETE to confirm" />
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-end">
                <button type="button" onClick={() => setDeleteOpen(false)} className="px-3 py-2 border rounded">Cancel</button>
                <button type="button" onClick={handleDeleteAccount} disabled={deleteConfirm !== 'DELETE'} className="px-3 py-2 bg-red-600 text-white rounded">Delete account</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
