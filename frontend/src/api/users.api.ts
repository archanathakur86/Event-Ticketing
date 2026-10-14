import { api } from './client'

export async function getAllUsers() {
  const res = await api.get('/api/users')
  return res
}

export async function createUser(data: any) {
  const res = await api.post('/api/users', data)
  return res
}

export async function updateUser(id: string | number, data: any) {
  const res = await api.patch(`/api/users/${id}`, data)
  return res
}

export async function deleteUser(id: string | number) {
  await api.del(`/api/users/${id}`)
  return true
}

export default { getAllUsers, createUser, updateUser, deleteUser }
