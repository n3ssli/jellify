import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// Pages
import Home from './pages/Home'
import Search from './pages/Search'
import Liked from './pages/Liked'
import Album from './pages/Album'
import Artist from './pages/Artist'
import Playlist from './pages/Playlist'
import Queue from './pages/Queue'
import Settings from './pages/Settings'
import Library from './pages/Library'
import CreatePlaylist from './pages/CreatePlaylist'
import Genre from './pages/Genre'
import Profile from './pages/Profile'

// Layout
import MainLayout from './layouts/MainLayout'

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="liked" element={<Liked />} />
        <Route path="album/:albumId" element={<Album />} />
        <Route path="artist/:artistId" element={<Artist />} />
        <Route path="playlist/:playlistId" element={<Playlist />} />
        <Route path="genre/:genreId" element={<Genre />} />
        <Route path="queue" element={<Queue />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
        <Route path="library" element={<Library />} />
        <Route path="playlist/create" element={<CreatePlaylist />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default AppRouter 