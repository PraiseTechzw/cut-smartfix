"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import type { Category } from "@cut-smartfix/contracts";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    fetchApi<Category[]>("/v1/categories")
      .then(setCategories)
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to load categories.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Categories</div>
          <div className="page-subtitle">
            Configure the issue taxonomy used for triage and reporting.
          </div>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="category-grid">
        {loading ? (
          <div className="loading-state">Loading categories…</div>
        ) : categories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No active categories</div>
            <div className="empty-state-text">
              Create categories in Supabase to make student reporting more
              specific.
            </div>
          </div>
        ) : (
          categories.map((category) => (
            <article className="category-card" key={category.id}>
              <div className="category-icon">{category.icon ?? "•"}</div>
              <div>
                <h3>{category.name}</h3>
                <p>{category.description ?? "No description"}</p>
                <span>{category.subcategories?.length ?? 0} subcategories</span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
