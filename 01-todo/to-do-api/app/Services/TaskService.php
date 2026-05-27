<?php

namespace App\Services;

use App\Models\Tasks;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class TaskService
{
    public function getAllTasks(int $perPage = 10, ?string $status = null): LengthAwarePaginator
    {
        if ($status === null || $status === '') {
            return Tasks::latest()->paginate($perPage);
        }
        return Tasks::where('status', $status)->latest()->paginate($perPage);
    }

    public function getTaskById(int $id): ?Tasks
    {
        $task=Tasks::find($id);
        if(!$task){
            return null;
        }
        return $task; 
    }

    public function createTask(array $data): Tasks
    {
        $task = Tasks::create([
            'titulo' => $data['titulo'],
            'descripcion' => $data['descripcion'],
            'status' => $data['status'] ?? 'pendiente'
        ]);
        return $task;
    }


    public function updateTask(int $id, array $data): ?Tasks
    {
        $task = Tasks::find($id);
        if (!$task) {
            return null;
        }
        $task->update($data);
        return $task; 
    }

    public function deleteTask(int $id): bool
    {
        $task = Tasks::find($id);
        if (!$task) {
            return false;
        }
        $task->delete();
        return true;
    }
}
